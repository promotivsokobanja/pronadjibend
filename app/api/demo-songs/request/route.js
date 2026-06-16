import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

// GET — fetch user's access statuses for all songs
export async function GET(request) {
  try {
    const auth = await getAuthUserFromRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Morate biti prijavljeni.' }, { status: 401 });
    }

    const accesses = await prisma.demoSongAccess.findMany({
      where: { userId: auth.userId },
      select: { songId: true, status: true },
    });

    // Return as map: { songId: status }
    const map = {};
    for (const a of accesses) {
      map[a.songId] = a.status;
    }

    return NextResponse.json(map);
  } catch (err) {
    console.error('[demo-songs/request GET]', err);
    return NextResponse.json({ error: 'Greška.' }, { status: 500 });
  }
}

// POST — user requests download access for a song
export async function POST(request) {
  try {
    const auth = await getAuthUserFromRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Morate biti prijavljeni.' }, { status: 401 });
    }

    // Check premium
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: true, plan: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Nalog ne postoji.' }, { status: 404 });
    }

    const plan = String(user.plan || '').toUpperCase();
    const isPremium = plan === 'PREMIUM' || plan === 'PREMIUM_VENUE';
    const isAdmin = user.role === 'ADMIN';

    if (!isAdmin && !isPremium) {
      return NextResponse.json(
        { error: 'Zahtev za preuzimanje je dostupan samo PREMIUM korisnicima.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { songId } = body;

    if (!songId) {
      return NextResponse.json({ error: 'Nedostaje songId.' }, { status: 400 });
    }

    // Check song exists
    const song = await prisma.demoSong.findUnique({
      where: { id: songId },
      select: { isActive: true },
    });

    if (!song || !song.isActive) {
      return NextResponse.json({ error: 'Pesma nije pronađena.' }, { status: 404 });
    }

    // Check if already requested
    const existing = await prisma.demoSongAccess.findUnique({
      where: { userId_songId: { userId: auth.userId, songId } },
    });

    if (existing) {
      return NextResponse.json({
        status: existing.status,
        message: existing.status === 'PENDING'
          ? 'Zahtev je već poslat. Čekate odobrenje admina.'
          : existing.status === 'APPROVED'
          ? 'Već imate odobrenje za preuzimanje.'
          : 'Vaš zahtev je odbijen.',
      });
    }

    // Create request
    const access = await prisma.demoSongAccess.create({
      data: { userId: auth.userId, songId },
    });

    return NextResponse.json({ status: access.status, message: 'Zahtev je poslat. Čekate odobrenje admina.' });
  } catch (err) {
    console.error('[demo-songs/request POST]', err);
    return NextResponse.json({ error: 'Greška.' }, { status: 500 });
  }
}
