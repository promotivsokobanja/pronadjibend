import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { resolveSongOwner } from '../../../../lib/songOwner';

export const dynamic = 'force-dynamic';

function normalizeSongCategory(category) {
  const value = String(category || '').trim();
  if (!value) return 'Muške Zabavne';
  if (value === 'Zabavne') return 'Muške Zabavne';
  if (value === 'Narodne') return 'Muške Narodne';
  if (value === 'Strane') return 'Starije Zabavne';
  return value;
}

/**
 * POST /api/songs/bulk-import
 * Body: { songs: Array<{ title, artist?, lyrics?, category?, type?, sourceSongId? }> }
 * Creates songs in the owner's repertoire. Skips duplicates.
 */
export async function POST(request) {
  try {
    const { owner, error } = await resolveSongOwner(request, {});
    if (error) return error;
    if (!owner) {
      return NextResponse.json({ error: 'Vlasnik nije pronađen.' }, { status: 400 });
    }

    const body = await request.json();
    const songs = Array.isArray(body.songs) ? body.songs.slice(0, 500) : [];

    if (songs.length === 0) {
      return NextResponse.json({ imported: 0, skipped: 0, results: [] });
    }

    const ownerData = owner.type === 'band'
      ? { bandId: owner.id, musicianProfileId: null }
      : { bandId: null, musicianProfileId: owner.id };

    // Get existing songs for duplicate check
    const existing = await prisma.song.findMany({
      where: owner.type === 'band' ? { bandId: owner.id } : { musicianProfileId: owner.id },
      select: { title: true, artist: true },
    });
    const existingSet = new Set(
      existing.map((s) => `${(s.title || '').toLowerCase()}|||${(s.artist || '').toLowerCase()}`)
    );

    let imported = 0;
    let skipped = 0;
    const results = [];

    for (const item of songs) {
      const title = String(item.title || '').trim();
      if (!title) {
        skipped++;
        continue;
      }
      const artist = String(item.artist || '').trim();
      const key = `${title.toLowerCase()}|||${artist.toLowerCase()}`;

      if (existingSet.has(key)) {
        skipped++;
        results.push({ title, artist, status: 'skipped' });
        continue;
      }

      // If sourceSongId is provided, pull lyrics from that global song
      let lyrics = item.lyrics || null;
      if (!lyrics && item.sourceSongId) {
        const source = await prisma.song.findUnique({
          where: { id: item.sourceSongId },
          select: { lyrics: true },
        });
        if (source?.lyrics) lyrics = source.lyrics;
      }

      // Fallback: search global pesmarica for lyrics
      if (!lyrics) {
        try {
          const globalMatch = await prisma.song.findFirst({
            where: {
              bandId: null,
              musicianProfileId: null,
              title: { equals: title, mode: 'insensitive' },
              ...(artist ? { artist: { contains: artist.split(/[,#&]/)[0].trim(), mode: 'insensitive' } } : {}),
              lyrics: { not: null },
            },
            select: { lyrics: true },
          });
          if (globalMatch?.lyrics) lyrics = globalMatch.lyrics;
        } catch { /* proceed without lyrics */ }
      }

      await prisma.song.create({
        data: {
          title,
          artist: artist || 'Nepoznat',
          lyrics,
          category: normalizeSongCategory(item.category),
          type: item.type || 'Zabavna',
          ...ownerData,
        },
      });

      existingSet.add(key);
      imported++;
      results.push({ title, artist, status: 'imported' });
    }

    return NextResponse.json({ imported, skipped, results });
  } catch (err) {
    console.error('POST /api/songs/bulk-import error:', err);
    return NextResponse.json({ error: 'Greška pri uvozu pesama.' }, { status: 500 });
  }
}
