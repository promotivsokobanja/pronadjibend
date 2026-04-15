import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { resolveSongOwner } from '../../../../lib/songOwner';

export const dynamic = 'force-dynamic';

/**
 * Strip leading numbers/bullets from a line.
 * "1. E draga"  → "E draga"
 * "03 - Lutka"  → "Lutka"
 * "14.Pesma"    → "Pesma"
 * "2) Tiho"     → "Tiho"
 */
function stripLeadingNumber(line) {
  return line.replace(/^\s*\d+[\.\)\-:\s]+\s*/, '').trim();
}

/**
 * Try to split "Title - Artist" or "Artist - Title".
 * Returns { title, artist } or null.
 */
function splitTitleArtist(text) {
  const sep = text.indexOf(' - ');
  if (sep === -1) return null;
  const left = text.substring(0, sep).trim();
  const right = text.substring(sep + 3).trim();
  if (!left || !right) return null;
  return { left, right };
}

/**
 * POST /api/songs/match-bulk
 * Body: { lines: string[] }
 * Returns: { results: Array<{ input, cleaned, match, status }> }
 *
 * status: "found" | "not_found"
 * match: { id, title, artist, hasLyrics } | null
 */
export async function POST(request) {
  try {
    const { owner, error } = await resolveSongOwner(request, {});
    if (error) return error;

    const body = await request.json();
    const lines = Array.isArray(body.lines) ? body.lines.slice(0, 500) : [];

    if (lines.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Get existing songs for this owner to detect duplicates
    const ownerWhere = owner.type === 'band'
      ? { bandId: owner.id }
      : { musicianProfileId: owner.id };
    const existingSongs = await prisma.song.findMany({
      where: ownerWhere,
      select: { title: true, artist: true },
    });
    const existingSet = new Set(
      existingSongs.map((s) => `${s.title.toLowerCase()}|||${s.artist.toLowerCase()}`)
    );

    const results = [];

    for (const rawLine of lines) {
      const cleaned = stripLeadingNumber(rawLine);
      if (!cleaned) continue;

      const parts = splitTitleArtist(cleaned);

      // Strategy: try multiple search approaches
      let match = null;

      // 1. Exact title match (case-insensitive) in global pesmarica
      if (!match) {
        const titleToSearch = parts ? parts.left : cleaned;
        const found = await prisma.song.findFirst({
          where: {
            bandId: null,
            musicianProfileId: null,
            title: { equals: titleToSearch, mode: 'insensitive' },
            ...(parts ? { artist: { contains: parts.right, mode: 'insensitive' } } : {}),
          },
          select: { id: true, title: true, artist: true, lyrics: true, category: true, type: true },
        });
        if (found) match = found;
      }

      // 2. If parts, try right side as title (swapped)
      if (!match && parts) {
        const found = await prisma.song.findFirst({
          where: {
            bandId: null,
            musicianProfileId: null,
            title: { equals: parts.right, mode: 'insensitive' },
            artist: { contains: parts.left, mode: 'insensitive' },
          },
          select: { id: true, title: true, artist: true, lyrics: true, category: true, type: true },
        });
        if (found) match = found;
      }

      // 3. Contains search on title only
      if (!match) {
        const titleToSearch = parts ? parts.left : cleaned;
        if (titleToSearch.length >= 3) {
          const found = await prisma.song.findFirst({
            where: {
              bandId: null,
              musicianProfileId: null,
              title: { contains: titleToSearch, mode: 'insensitive' },
            },
            select: { id: true, title: true, artist: true, lyrics: true, category: true, type: true },
          });
          if (found) match = found;
        }
      }

      const alreadyInRepertoire = match
        ? existingSet.has(`${match.title.toLowerCase()}|||${match.artist.toLowerCase()}`)
        : false;

      results.push({
        input: rawLine,
        cleaned,
        parsedTitle: parts ? parts.left : cleaned,
        parsedArtist: parts ? parts.right : null,
        status: match ? 'found' : 'not_found',
        alreadyInRepertoire,
        match: match
          ? {
              id: match.id,
              title: match.title,
              artist: match.artist,
              hasLyrics: !!match.lyrics,
              category: match.category,
              type: match.type,
            }
          : null,
      });
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error('POST /api/songs/match-bulk error:', err);
    return NextResponse.json({ error: 'Greška pri analizi liste.' }, { status: 500 });
  }
}
