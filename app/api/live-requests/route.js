import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { emitLiveRequestEvent } from '@/lib/liveRealtime';

export const dynamic = 'force-dynamic';

/** Ukloni zastareli interni prefiks iz prikaza (stariji zapisi u bazi). */
function displayWaiterNote(note) {
  if (!note || typeof note !== 'string') return '';
  return note.replace(/^STRELO:\s*/i, '').trim();
}

function normalizeMaxPendingRequests(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  const normalized = Math.floor(parsed);
  if (normalized < 0) return 0;
  return normalized;
}

async function hasPendingCapacity(bandId, maxPendingRequests) {
  const max = normalizeMaxPendingRequests(maxPendingRequests);
  if (max === 0) return true;
  const pendingCount = await prisma.liveRequest.count({
    where: { bandId, status: 'PENDING' },
  });
  return pendingCount < max;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bandId = String(searchParams.get('bandId') || '').trim();
    const takeParam = Number(searchParams.get('take'));
    const take = Number.isFinite(takeParam) ? Math.min(Math.max(Math.floor(takeParam), 1), 100) : 50;

    if (!bandId) {
      return NextResponse.json({ error: 'bandId je obavezan' }, { status: 400 });
    }

    const requests = await prisma.liveRequest.findMany({
      where: { bandId },
      select: {
        id: true,
        tableNum: true,
        status: true,
        createdAt: true,
        requestType: true,
        guestNote: true,
        tipAmountRsd: true,
        song: { select: { id: true, title: true, artist: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    const mapped = requests.map((r) => {
      const type = (r.requestType || 'SONG').toUpperCase();
      const isWaiterTip = type === 'WAITER_TIP';
      const tipAmt = r.tipAmountRsd != null ? Number(r.tipAmountRsd) : 0;
      const isSongWithTip = type === 'SONG' && tipAmt > 0;
      const apiType = isWaiterTip ? 'waiter_tip' : isSongWithTip ? 'song_with_tip' : 'song';
      return {
        id: r.id,
        song: isWaiterTip
          ? displayWaiterNote(r.guestNote) || 'Bakšiš preko konobara'
          : (r.song?.title || 'Nepoznata pesma'),
        songId: r.song?.id || null,
        artist: isWaiterTip ? '' : (r.song?.artist || ''),
        client: `Sto ${r.tableNum}`,
        tableNum: r.tableNum,
        status: r.status.toLowerCase(),
        time: formatTimeAgo(r.createdAt),
        createdAt: r.createdAt,
        requestType: apiType,
        guestNote: r.guestNote ? displayWaiterNote(r.guestNote) : null,
        tipAmountRsd: tipAmt > 0 ? tipAmt : null,
        tip: isWaiterTip || isSongWithTip ? 'BAKŠIŠ' : undefined,
      };
    });
    return NextResponse.json(mapped, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('LiveRequest GET error:', err);
    return NextResponse.json({ error: 'Greška pri učitavanju zahteva' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const requestType = String(body?.requestType || 'SONG').toUpperCase();

    if (requestType === 'WAITER_TIP') {
      const bandId = String(body?.bandId || '').trim();
      const tableNum = body?.tableNum != null ? String(body.tableNum).trim() : '';
      const message = String(body?.message || '').trim();

      if (!bandId || !tableNum) {
        return NextResponse.json(
          { error: 'bandId i tableNum su obavezni za bakšiš preko konobara.' },
          { status: 400 }
        );
      }

      if (!message || message.length < 8) {
        return NextResponse.json(
          { error: 'Poruka za bakšiš je obavezna (prekratka ili prazna).' },
          { status: 400 }
        );
      }

      const band = await prisma.band.findUnique({
        where: { id: bandId },
        select: { id: true, maxPendingRequests: true },
      });
      if (!band) {
        return NextResponse.json({ error: 'Bend nije pronađen' }, { status: 404 });
      }

      const canQueue = await hasPendingCapacity(bandId, band.maxPendingRequests);
      if (!canQueue) {
        return NextResponse.json(
          {
            error: `Trenutno je dostignut limit zahteva na čekanju (${normalizeMaxPendingRequests(band.maxPendingRequests)}). Sačekajte da bend prihvati neki zahtev.`,
          },
          { status: 429 }
        );
      }

      const liveRequest = await prisma.liveRequest.create({
        data: {
          bandId,
          tableNum,
          status: 'PENDING',
          requestType: 'WAITER_TIP',
          guestNote: message,
          songId: null,
        },
        select: { id: true, tableNum: true },
      });

      emitLiveRequestEvent('created', {
        id: liveRequest.id,
        bandId,
        status: 'pending',
        requestType: 'waiter_tip',
      });

      return NextResponse.json({
        id: liveRequest.id,
        tableNum: liveRequest.tableNum,
        status: 'pending',
        requestType: 'waiter_tip',
      });
    }

    const songId = String(body?.songId || '').trim();
    const bandId = String(body?.bandId || '').trim();
    const tNum = body?.tableNum != null ? String(body.tableNum).trim() : '';
    const waiterTipRsdRaw = body?.waiterTipRsd;
    const waiterTipParsed =
      waiterTipRsdRaw === null || waiterTipRsdRaw === undefined || waiterTipRsdRaw === ''
        ? 0
        : Number(waiterTipRsdRaw);
    const waiterTipRsd =
      Number.isFinite(waiterTipParsed) && waiterTipParsed > 0 ? Math.floor(waiterTipParsed) : 0;

    if (!songId || !bandId || !tNum) {
      return NextResponse.json(
        { error: 'songId, bandId i tableNum su obavezni' },
        { status: 400 }
      );
    }

    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: { id: true, allowTips: true, maxPendingRequests: true },
    });
    if (!band) {
      return NextResponse.json({ error: 'Bend nije pronađen' }, { status: 404 });
    }

    const canQueue = await hasPendingCapacity(bandId, band.maxPendingRequests);
    if (!canQueue) {
      return NextResponse.json(
        {
          error: `Trenutno je dostignut limit zahteva na čekanju (${normalizeMaxPendingRequests(band.maxPendingRequests)}). Sačekajte da bend prihvati neki zahtev.`,
        },
        { status: 429 }
      );
    }

    if (waiterTipRsd > 0 && !band.allowTips) {
      return NextResponse.json(
        { error: 'Bend je isključio opciju bakšiša za goste.' },
        { status: 403 }
      );
    }

    const song = await prisma.song.findUnique({
      where: { id: songId },
      select: { id: true, title: true, artist: true },
    });
    if (!song) {
      return NextResponse.json({ error: 'Pesma nije pronađena' }, { status: 404 });
    }

    let guestNote = null;
    if (waiterTipRsd > 0) {
      guestNote = `Sto ${tNum} časti muziku (${waiterTipRsd} RSD) uz pesmu «${song.title}»`;
    }

    const liveRequest = await prisma.liveRequest.create({
      data: {
        songId,
        bandId,
        tableNum: tNum,
        status: 'PENDING',
        requestType: 'SONG',
        tipAmountRsd: waiterTipRsd > 0 ? waiterTipRsd : null,
        guestNote,
      },
      select: {
        id: true,
        tableNum: true,
      },
    });

    emitLiveRequestEvent('created', {
      id: liveRequest.id,
      bandId,
      status: 'pending',
      requestType: waiterTipRsd > 0 ? 'song_with_tip' : 'song',
    });

    return NextResponse.json({
      id: liveRequest.id,
      song: song.title,
      artist: song.artist,
      tableNum: liveRequest.tableNum,
      status: 'pending',
      requestType: waiterTipRsd > 0 ? 'song_with_tip' : 'song',
      waiterTipRsd: waiterTipRsd > 0 ? waiterTipRsd : null,
    });
  } catch (err) {
    console.error('LiveRequest POST error:', err);
    return NextResponse.json({ error: 'Greška pri slanju zahteva' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id i status su obavezni' }, { status: 400 });
    }

    const validStatuses = ['PENDING', 'PLAYED', 'REJECTED', 'ACCEPTED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return NextResponse.json({ error: 'Nevažeći status' }, { status: 400 });
    }

    const updated = await prisma.liveRequest.update({
      where: { id },
      data: { status: status.toUpperCase() },
    });

    emitLiveRequestEvent('updated', {
      id: updated.id,
      bandId: updated.bandId,
      status: updated.status.toLowerCase(),
    });

    return NextResponse.json({ id: updated.id, status: updated.status.toLowerCase() });
  } catch (err) {
    console.error('LiveRequest PATCH error:', err);
    return NextResponse.json({ error: 'Greška pri ažuriranju zahteva' }, { status: 500 });
  }
}

function formatTimeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);
  if (diff < 60) return 'upravo';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
