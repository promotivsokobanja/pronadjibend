import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/live-songs?bandId=X or ?musicianId=X
// Returns deduplicated songs from all setlists where isLive = true
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bandId = searchParams.get('bandId');
    const musicianId = searchParams.get('musicianId');

    const where = { isLive: true };
    if (bandId) where.bandId = bandId;
    else if (musicianId) where.musicianProfileId = musicianId;
    else return NextResponse.json({ error: 'bandId ili musicianId je obavezan.' }, { status: 400 });

    // Find all live setlists with their song items
    const liveSetLists = await prisma.setList.findMany({
      where,
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            song: {
              select: {
                id: true,
                title: true,
                artist: true,
                category: true,
                type: true,
              },
            },
          },
        },
      },
    });

    // Collect unique songs (deduplicate by song.id)
    const songMap = new Map();
    for (const setList of liveSetLists) {
      for (const item of setList.items) {
        if (item.song && !songMap.has(item.song.id)) {
          songMap.set(item.song.id, item.song);
        }
      }
    }

    const songs = Array.from(songMap.values());

    return NextResponse.json({
      songs,
      hasLiveSetLists: liveSetLists.length > 0,
    });
  } catch (err) {
    console.error('GET /api/live-songs error:', err);
    return NextResponse.json({ error: 'Greška pri učitavanju pesama.' }, { status: 500 });
  }
}
