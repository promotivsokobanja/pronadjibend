import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

function buildOwnerFilter(owner) {
  return owner.type === 'band' ? { bandId: owner.id } : { musicianProfileId: owner.id };
}

async function resolveLiveOwner({ bandId, musicianId }) {
  const normalizedBandId = bandId ? String(bandId).trim() : '';
  const normalizedMusicianId = musicianId ? String(musicianId).trim() : '';

  if (normalizedBandId) {
    const band = await prisma.band.findUnique({
      where: { id: normalizedBandId },
      select: { id: true, allowTips: true, maxPendingRequests: true },
    });
    if (!band) {
      return {
        error: NextResponse.json({ error: 'Bend nije pronađen.' }, { status: 404 }),
      };
    }
    return {
      owner: {
        type: 'band',
        id: band.id,
        allowTips: band.allowTips,
        maxPendingRequests: band.maxPendingRequests,
      },
    };
  }

  if (normalizedMusicianId) {
    const musician = await prisma.musicianProfile.findUnique({
      where: { id: normalizedMusicianId },
      select: { id: true },
    });
    if (!musician) {
      return {
        error: NextResponse.json({ error: 'Muzičar nije pronađen.' }, { status: 404 }),
      };
    }
    return {
      owner: {
        type: 'musician',
        id: musician.id,
        allowTips: true,
        maxPendingRequests: 10,
      },
    };
  }

  return {
    error: NextResponse.json(
      { error: 'bandId ili musicianId su obavezni.' },
      { status: 400 }
    ),
  };
}

async function hasPendingCapacity(ownerFilter, maxPendingRequests) {
  const max = normalizeMaxPendingRequests(maxPendingRequests);
  if (max === 0) return true;
  const pendingCount = await prisma.liveRequest.count({
    where: { ...ownerFilter, status: 'PENDING' },
  });
  return pendingCount < max;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const { owner, error } = await resolveLiveOwner({
      bandId: searchParams.get('bandId'),
      musicianId: searchParams.get('musicianId'),
    });
    if (error) return error;

    const requests = await prisma.liveRequest.findMany({
      where: buildOwnerFilter(owner),
      include: {
        song: { select: { id: true, title: true, artist: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
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

    return NextResponse.json(mapped);
  } catch (err) {
    console.error('LiveRequest GET error:', err);
    return NextResponse.json({ error: 'Greška pri učitavanju zahteva' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const requestType = String(body?.requestType || 'SONG').toUpperCase();
    const { owner, error } = await resolveLiveOwner({
      bandId: body?.bandId,
      musicianId: body?.musicianId,
    });
    if (error) return error;

    const ownerFilter = buildOwnerFilter(owner);

    if (requestType === 'WAITER_TIP') {
      const tableNum = body?.tableNum != null ? String(body.tableNum).trim() : '';
      const message = String(body?.message || '').trim();

      if (!tableNum) {
        return NextResponse.json(
          { error: 'tableNum je obavezan za bakšiš preko konobara.' },
          { status: 400 }
        );
      }

      if (!message || message.length < 8) {
        return NextResponse.json(
          { error: 'Poruka za bakšiš je obavezna (prekratka ili prazna).' },
          { status: 400 }
        );
      }

      const canQueue = await hasPendingCapacity(ownerFilter, owner.maxPendingRequests);
      if (!canQueue) {
        return NextResponse.json(
          {
            error: `Trenutno je dostignut limit zahteva na čekanju (${normalizeMaxPendingRequests(owner.maxPendingRequests)}). Sačekajte da izvođač prihvati neki zahtev.`,
          },
          { status: 429 }
        );
      }

      const liveRequest = await prisma.liveRequest.create({
        data: {
          ...ownerFilter,
          tableNum,
          status: 'PENDING',
          requestType: 'WAITER_TIP',
          guestNote: message,
          songId: null,
        },
        include: {
          song: { select: { title: true, artist: true } },
        },
      });

      return NextResponse.json({
        id: liveRequest.id,
        tableNum: liveRequest.tableNum,
        status: 'pending',
        requestType: 'waiter_tip',
      });
    }

    const { songId, tableNum } = body;
    const waiterTipRsdRaw = body?.waiterTipRsd;
    const waiterTipParsed =
      waiterTipRsdRaw === null || waiterTipRsdRaw === undefined || waiterTipRsdRaw === ''
        ? 0
        : Number(waiterTipRsdRaw);
    const waiterTipRsd =
      Number.isFinite(waiterTipParsed) && waiterTipParsed > 0 ? Math.floor(waiterTipParsed) : 0;

    if (!songId || !tableNum) {
      return NextResponse.json(
        { error: 'songId i tableNum su obavezni' },
        { status: 400 }
      );
    }

    const canQueue = await hasPendingCapacity(ownerFilter, owner.maxPendingRequests);
    if (!canQueue) {
      return NextResponse.json(
        {
          error: `Trenutno je dostignut limit zahteva na čekanju (${normalizeMaxPendingRequests(owner.maxPendingRequests)}). Sačekajte da izvođač prihvati neki zahtev.`,
        },
        { status: 429 }
      );
    }

    if (waiterTipRsd > 0 && owner.type === 'band' && owner.allowTips === false) {
      return NextResponse.json(
        { error: 'Izvođač je isključio opciju bakšiša za goste.' },
        { status: 403 }
      );
    }

    const song = await prisma.song.findFirst({
      where: {
        id: songId,
        ...(owner.type === 'band'
          ? { bandId: owner.id }
          : { musicianProfileId: owner.id }),
      },
    });
    if (!song) {
      return NextResponse.json({ error: 'Pesma nije pronađena.' }, { status: 404 });
    }

    const tNum = String(tableNum).trim();
    let guestNote = null;
    if (waiterTipRsd > 0) {
      guestNote = `Sto ${tNum} časti muziku (${waiterTipRsd} RSD) uz pesmu «${song.title}»`;
    }

    const liveRequest = await prisma.liveRequest.create({
      data: {
        songId,
        ...ownerFilter,
        tableNum: tNum,
        status: 'PENDING',
        requestType: 'SONG',
        tipAmountRsd: waiterTipRsd > 0 ? waiterTipRsd : null,
        guestNote,
      },
      include: {
        song: { select: { title: true, artist: true } },
      },
    });

    return NextResponse.json({
      id: liveRequest.id,
      song: liveRequest.song?.title,
      artist: liveRequest.song?.artist,
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
