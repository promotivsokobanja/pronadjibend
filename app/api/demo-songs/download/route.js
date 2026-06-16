import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Nedostaje ID.' }, { status: 400 });

    // Auth required
    const auth = await getAuthUserFromRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Morate biti prijavljeni.' }, { status: 401 });
    }

    // Check user plan
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: true, plan: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Nalog ne postoji.' }, { status: 404 });
    }

    const isAdmin = user.role === 'ADMIN';
    const plan = String(user.plan || '').toUpperCase();
    const isPremium = plan === 'PREMIUM' || plan === 'PREMIUM_VENUE';

    if (!isAdmin && !isPremium) {
      return NextResponse.json(
        { error: 'Preuzimanje autorskih pesama je dostupno samo za PREMIUM korisnike.' },
        { status: 403 }
      );
    }

    // Check song exists and download is allowed
    const song = await prisma.demoSong.findUnique({
      where: { id },
      select: { driveLink: true, allowDownload: true, isActive: true, lyrics: true, title: true, artist: true },
    });

    if (!song || !song.isActive) {
      return NextResponse.json({ error: 'Pesma nije pronađena.' }, { status: 404 });
    }

    if (!song.allowDownload && !isAdmin) {
      return NextResponse.json(
        { error: 'Preuzimanje za ovu pesmu nije omogućeno.' },
        { status: 403 }
      );
    }

    // Per-user approval check (admin bypasses)
    if (!isAdmin) {
      const access = await prisma.demoSongAccess.findUnique({
        where: { userId_songId: { userId: auth.userId, songId: id } },
      });

      if (!access || access.status !== 'PAID') {
        return NextResponse.json(
          { error: 'Nemate pristup za preuzimanje. Uplatite pesmu prema uputstvu i sačekajte potvrdu.' },
          { status: 403 }
        );
      }
    }

    if (!song.driveLink) {
      return NextResponse.json(
        { error: 'Link za preuzimanje nije postavljen.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ url: song.driveLink, lyrics: song.lyrics || null, title: song.title, artist: song.artist });
  } catch (err) {
    console.error('[demo-songs/download]', err);
    return NextResponse.json({ error: 'Greška.' }, { status: 500 });
  }
}
