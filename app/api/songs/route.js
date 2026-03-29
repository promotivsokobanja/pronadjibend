import prisma from '../../../lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const bandId = searchParams.get('bandId');
    const limitRaw = searchParams.get('limit');
    const take =
      limitRaw != null && limitRaw !== ''
        ? Math.min(Math.max(parseInt(limitRaw, 10) || 0, 1), 100)
        : undefined;

    let where = {};
    if (bandId) where.bandId = bandId;
    if (category && category !== 'Sve') where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { artist: { contains: search, mode: 'insensitive' } },
      ];
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
    const { title, artist, lyrics, chords, category, type, bandId } = await request.json();

    if (!title || !artist) {
      return NextResponse.json({ error: 'Naslov i izvođač su obavezni.' }, { status: 400 });
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
      data: { title, artist, lyrics: finalLyrics, chords, category, type, bandId },
    });

    return NextResponse.json({ success: true, song });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Greška pri dodavanju pesme.' }, { status: 500 });
  }
}
