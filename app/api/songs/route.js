import prisma from '../../../lib/prisma';
import { NextResponse } from 'next/server';
import { resolveSongOwner } from '../../../lib/songOwner';

export const dynamic = 'force-dynamic';

const CATEGORY_FILTER_MAP = {
  'Muške Zabavne': ['Muške Zabavne', 'Zabavne'],
  'Ženske Zabavne': ['Ženske Zabavne'],
  'Muške Narodne': ['Muške Narodne', 'Narodne'],
  'Ženske Narodne': ['Ženske Narodne'],
  'Razno': ['Razno', 'Starije Zabavne', 'Strane'],
  'Strane Muške': ['Strane Muške'],
  'Strane Ženske': ['Strane Ženske'],
};

function normalizeSongCategory(category) {
  const value = String(category || '').trim();
  if (!value) return value;
  if (value === 'Zabavne') return 'Muške Zabavne';
  if (value === 'Narodne') return 'Muške Narodne';
  if (value === 'Strane' || value === 'Starije Zabavne') return 'Razno';
  return value;
}

async function createPendingSubmissionIfNeeded(song, owner) {
  const normalizedBandId = owner?.type === 'band' ? String(owner.id || '').trim() : '';
  const normalizedMusicianId = owner?.type === 'musician' ? String(owner.id || '').trim() : '';
  if (!normalizedBandId && !normalizedMusicianId) return;

  const existingGlobal = await prisma.song.findFirst({
    where: {
      bandId: null,
      title: { equals: song.title, mode: 'insensitive' },
      artist: { equals: song.artist, mode: 'insensitive' },
    },
    select: { id: true },
  });

  if (existingGlobal) return;

  const existingPending = await prisma.songSubmission.findFirst({
    where: {
      status: 'PENDING',
      ...(normalizedBandId ? { submittedByBandId: normalizedBandId } : {}),
      ...(normalizedMusicianId ? { submittedByMusicianId: normalizedMusicianId } : {}),
      title: { equals: song.title, mode: 'insensitive' },
      artist: { equals: song.artist, mode: 'insensitive' },
    },
    select: { id: true },
  });

  if (existingPending) return;

  await prisma.songSubmission.create({
    data: {
      title: song.title,
      artist: song.artist,
      lyrics: song.lyrics,
      chords: song.chords,
      key: song.key,
      category: song.category,
      type: song.type,
      sourceSongId: song.id,
      submittedByBandId: normalizedBandId || null,
      submittedByMusicianId: normalizedMusicianId || null,
    },
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const bandId = searchParams.get('bandId');
    const musicianId = searchParams.get('musicianId');
    const limitRaw = searchParams.get('limit');
    const take =
      limitRaw != null && limitRaw !== ''
        ? Math.min(Math.max(parseInt(limitRaw, 10) || 0, 1), 100)
        : undefined;

    let where = {};
    if (bandId) {
      where.bandId = bandId;
    } else if (musicianId) {
      where.musicianProfileId = musicianId;
    }

    if (category && category !== 'Sve') {
      const allowedCategories = CATEGORY_FILTER_MAP[category];
      where.category = allowedCategories ? { in: allowedCategories } : category;
    }
    if (search) {
      const words = search.split(/\s+/).filter((w) => w.length >= 2);
      if (words.length > 1) {
        where.AND = words.map((word) => ({
          OR: [
            { title: { contains: word, mode: 'insensitive' } },
            { artist: { contains: word, mode: 'insensitive' } },
          ],
        }));
      } else {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { artist: { contains: search, mode: 'insensitive' } },
        ];
      }
    }

    const songs = await prisma.song.findMany({
      where,
      orderBy: { title: 'asc' },
      ...(take ? { take } : {}),
    });
    return NextResponse.json(songs);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, artist, lyrics, chords, category, type } = body;
    const { owner, error } = await resolveSongOwner(request, body || {});
    if (error) return error;

    if (!owner) {
      return NextResponse.json({ error: 'Nije pronađen vlasnik pesme.' }, { status: 400 });
    }

    if (!title || !artist) {
      return NextResponse.json({ error: 'Naslov i izvođač su obavezni.' }, { status: 400 });
    }

    // Prevent duplicates: check if this owner already has this song
    const duplicateWhere = {
      title: { equals: title, mode: 'insensitive' },
      artist: { equals: artist, mode: 'insensitive' },
    };
    if (owner.type === 'band') {
      duplicateWhere.bandId = owner.id;
    } else {
      duplicateWhere.musicianProfileId = owner.id;
    }
    const existingOwnerSong = await prisma.song.findFirst({
      where: duplicateWhere,
    });
    if (existingOwnerSong) {
      return NextResponse.json({ success: true, song: existingOwnerSong, duplicate: true });
    }

    let finalLyrics = lyrics || null;

    if (!finalLyrics) {
      try {
        const existing = await prisma.song.findFirst({
          where: {
            title: { equals: title, mode: 'insensitive' },
            artist: { contains: artist.split(/[,#&]/)[0].trim(), mode: 'insensitive' },
            lyrics: { not: null },
          },
          select: { lyrics: true },
        });
        if (existing?.lyrics) finalLyrics = existing.lyrics;
      } catch {
        // Fallback: proceed without lyrics
      }
    }

    const song = await prisma.song.create({
      data: {
        title,
        artist,
        lyrics: finalLyrics,
        chords,
        category: normalizeSongCategory(category),
        type,
        bandId: owner?.type === 'band' ? owner.id : null,
        musicianProfileId: owner?.type === 'musician' ? owner.id : null,
      },
    });

    try {
      await createPendingSubmissionIfNeeded(song, owner);
    } catch (submissionError) {
      console.error('Song submission queue error:', submissionError);
    }

    return NextResponse.json({ success: true, song });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Greška pri dodavanju pesme.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { owner, error } = await resolveSongOwner(request, {});
    if (error) return error;

    if (!owner) {
      return NextResponse.json({ error: 'Nije pronađen vlasnik pesama.' }, { status: 400 });
    }

    const ownerWhere = owner.type === 'band'
      ? { bandId: owner.id }
      : { musicianProfileId: owner.id };

    const ownerSongs = await prisma.song.findMany({
      where: ownerWhere,
      select: { id: true },
    });

    if (ownerSongs.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const songIds = ownerSongs.map((song) => song.id);

    const [, , deleteResult] = await prisma.$transaction([
      prisma.liveRequest.updateMany({
        where: { songId: { in: songIds } },
        data: { songId: null },
      }),
      prisma.setListItem.deleteMany({
        where: { songId: { in: songIds } },
      }),
      prisma.song.deleteMany({
        where: ownerWhere,
      }),
    ]);

    return NextResponse.json({ success: true, deleted: deleteResult.count });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Greška pri brisanju repertoara.' }, { status: 500 });
  }
}
