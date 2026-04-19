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

    if (!bandId && !musicianId) {
      return NextResponse.json({ error: 'bandId ili musicianId je obavezan.' }, { status: 400 });
    }

    // Check if owner has allowFullRepertoireLive enabled
    let allowFullRepertoireLive = false;
    if (bandId) {
      const band = await prisma.band.findUnique({
        where: { id: bandId },
        select: { allowFullRepertoireLive: true },
      });
      allowFullRepertoireLive = Boolean(band?.allowFullRepertoireLive);
    } else if (musicianId) {
      const musician = await prisma.musicianProfile.findUnique({
        where: { id: musicianId },
        select: { allowFullRepertoireLive: true },
      });
      allowFullRepertoireLive = Boolean(musician?.allowFullRepertoireLive);
    }

    const setlistWhere = { isLive: true };
    if (bandId) setlistWhere.bandId = bandId;
    else setlistWhere.musicianProfileId = musicianId;

    // Find all live setlists with their song items
    const liveSetLists = await prisma.setList.findMany({
      where: setlistWhere,
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

    // If allowFullRepertoireLive is true, include entire repertoire
    if (allowFullRepertoireLive) {
      const songsWhere = bandId ? { bandId } : { musicianProfileId: musicianId };
      const allSongs = await prisma.song.findMany({
        where: songsWhere,
        select: {
          id: true,
          title: true,
          artist: true,
          category: true,
          type: true,
        },
        orderBy: { title: 'asc' },
      });
      for (const s of allSongs) {
        if (!songMap.has(s.id)) songMap.set(s.id, s);
      }
    }

    const songs = Array.from(songMap.values());

    return NextResponse.json({
      songs,
      hasLiveSetLists: liveSetLists.length > 0 || allowFullRepertoireLive,
      allowFullRepertoireLive,
    });
  } catch (err) {
    console.error('GET /api/live-songs error:', err);
    return NextResponse.json({ error: 'Greška pri učitavanju pesama.' }, { status: 500 });
  }
}
