import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bandId = searchParams.get('bandId');

    if (!bandId) {
      return NextResponse.json({ error: 'bandId je obavezan' }, { status: 400 });
    }

    const requests = await prisma.liveRequest.findMany({
      where: { bandId },
      include: {
        song: { select: { id: true, title: true, artist: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const mapped = requests.map((r) => {
      const type = (r.requestType || 'SONG').toUpperCase();
      const isWaiterTip = type === 'WAITER_TIP';
      const apiType = isWaiterTip ? 'waiter_tip' : 'song';
      return {
        id: r.id,
        song: isWaiterTip
          ? (r.guestNote || 'Bakšiš preko konobara')
          : (r.song?.title || 'Nepoznata pesma'),
        songId: r.song?.id || null,
        artist: isWaiterTip ? '' : (r.song?.artist || ''),
        client: `Sto ${r.tableNum}`,
        tableNum: r.tableNum,
        status: r.status.toLowerCase(),
        time: formatTimeAgo(r.createdAt),
        createdAt: r.createdAt,
        requestType: apiType,
        guestNote: r.guestNote || null,
        tip: isWaiterTip ? 'BAKŠIŠ' : undefined,
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

    if (requestType === 'WAITER_TIP') {
      const bandId = body?.bandId;
      const tableNum = body?.tableNum != null ? String(body.tableNum).trim() : '';
      const message = String(body?.message || '').trim();

      if (!bandId || !tableNum) {
        return NextResponse.json(
          { error: 'bandId i tableNum su obavezni za bakšiš preko konobara.' },
          { status: 400 }
        );
      }

      if (!message || !message.startsWith('STRELO:')) {
        return NextResponse.json(
          { error: 'Poruka mora početi sa STRELO: (ispravan format bakšiša).' },
          { status: 400 }
        );
      }

      const band = await prisma.band.findUnique({ where: { id: bandId }, select: { id: true } });
      if (!band) {
        return NextResponse.json({ error: 'Bend nije pronađen' }, { status: 404 });
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

    const { songId, bandId, tableNum } = body;

    if (!songId || !bandId || !tableNum) {
      return NextResponse.json(
        { error: 'songId, bandId i tableNum su obavezni' },
        { status: 400 }
      );
    }

    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song) {
      return NextResponse.json({ error: 'Pesma nije pronađena' }, { status: 404 });
    }

    const liveRequest = await prisma.liveRequest.create({
      data: {
        songId,
        bandId,
        tableNum: String(tableNum),
        status: 'PENDING',
        requestType: 'SONG',
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
      requestType: 'song',
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
