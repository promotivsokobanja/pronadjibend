import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { resolveSongOwner } from '../../../../lib/songOwner';

export const dynamic = 'force-dynamic';

/**
 * Normalize accents/punctuation and convert to lowercase.
 * "Žuti" → "zuti"
 * "Hello, World!" → "hello world"
 */
function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[._,;:!?'"`~()[\]{}|/\\]+/g, ' ')
    .replace(/[-–—]+/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Build search variants for a given value.
 * "Žuti" → ["Žuti", "zuti", "zuti"]
 */
function buildSearchVariants(value) {
  const base = String(value || '').trim();
  if (!base) return [];
  const normalized = normalizeText(base);
  const collapsed = normalized.replace(/\s+/g, '');
  return Array.from(new Set([base, normalized, collapsed].filter(Boolean)));
}

/**
 * Build word clauses for token-based search.
 * "Žuti svet" → [{ OR: [{ title: { contains: "zuti", mode: "insensitive" } }, { artist: { contains: "zuti", mode: "insensitive" } }] }, { OR: [{ title: { contains: "svet", mode: "insensitive" } }, { artist: { contains: "svet", mode: "insensitive" } }] }]
 */
function buildWordClauses(value, fieldNames = ['title', 'artist']) {
  const words = Array.from(
    new Set(
      normalizeText(value)
        .split(/\s+/)
        .filter((word) => word.length >= 2 && word !== '-')
    )
  ).slice(0, 8);

  if (words.length === 0) return [];

  return words.map((word) => ({
    OR: fieldNames.map((field) => ({
      [field]: { contains: word, mode: 'insensitive' },
    })),
  }));
}

function scoreCandidate(candidate, titleToSearch, artistToSearch, cleaned) {
  const candidateTitle = normalizeText(candidate.title);
  const candidateArtist = normalizeText(candidate.artist);
  const candidateFull = `${candidateTitle} ${candidateArtist}`.trim();
  const normalizedTitle = normalizeText(titleToSearch);
  const normalizedArtist = normalizeText(artistToSearch);
  const normalizedCleaned = normalizeText(cleaned);

  let score = 0;

  if (normalizedTitle && candidateTitle === normalizedTitle) score += 120;
  if (normalizedArtist && candidateArtist === normalizedArtist) score += 90;
  if (normalizedTitle && candidateTitle.includes(normalizedTitle)) score += 50;
  if (normalizedArtist && candidateArtist.includes(normalizedArtist)) score += 40;
  if (normalizedCleaned && candidateFull.includes(normalizedCleaned)) score += 35;

  const words = Array.from(new Set(normalizedCleaned.split(/\s+/).filter((word) => word.length >= 2 && word !== '-')));
  for (const word of words) {
    if (candidateTitle.includes(word)) score += 12;
    else if (candidateArtist.includes(word)) score += 9;
  }

  return score;
}

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
  const normalized = String(text || '')
    .replace(/[–—]/g, '-')
    .replace(/\.{2,}/g, ' - ')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
  const separators = [' - ', ' / ', ' | '];
  for (const separator of separators) {
    const sep = normalized.indexOf(separator);
    if (sep === -1) continue;
    const left = normalized.substring(0, sep).trim();
    const right = normalized.substring(sep + separator.length).trim();
    if (!left || !right) continue;
    return { left, right };
  }
  return null;
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
      const titleToSearch = parts ? parts.left : cleaned;
      const artistToSearch = parts ? parts.right : '';

      let match = null;

      if (!match) {
        for (const variant of buildSearchVariants(titleToSearch)) {
          const found = await prisma.song.findFirst({
            where: {
              bandId: null,
              musicianProfileId: null,
              title: { equals: variant, mode: 'insensitive' },
              ...(artistToSearch ? { artist: { contains: artistToSearch, mode: 'insensitive' } } : {}),
            },
            select: { id: true, title: true, artist: true, lyrics: true, category: true, type: true },
          });
          if (found) {
            match = found;
            break;
          }
        }
      }

      if (!match && parts) {
        for (const variant of buildSearchVariants(parts.right)) {
          const found = await prisma.song.findFirst({
            where: {
              bandId: null,
              musicianProfileId: null,
              title: { equals: variant, mode: 'insensitive' },
              artist: { contains: parts.left, mode: 'insensitive' },
            },
            select: { id: true, title: true, artist: true, lyrics: true, category: true, type: true },
          });
          if (found) {
            match = found;
            break;
          }
        }
      }

      if (!match) {
        if (normalizeText(titleToSearch).length >= 3) {
          const found = await prisma.song.findFirst({
            where: {
              bandId: null,
              musicianProfileId: null,
              AND: [
                ...buildWordClauses(titleToSearch, ['title']),
                ...(artistToSearch ? buildWordClauses(artistToSearch, ['artist']) : []),
              ],
            },
            select: { id: true, title: true, artist: true, lyrics: true, category: true, type: true },
          });
          if (found) match = found;
        }
      }

      if (!match) {
        const found = await prisma.song.findFirst({
          where: {
            bandId: null,
            musicianProfileId: null,
            AND: buildWordClauses(cleaned, ['title', 'artist']),
          },
          select: { id: true, title: true, artist: true, lyrics: true, category: true, type: true },
        });
        if (found) match = found;
      }

      if (!match) {
        const broadWords = Array.from(
          new Set(
            normalizeText(cleaned)
              .split(/\s+/)
              .filter((word) => word.length >= 3 && word !== '-')
          )
        ).slice(0, 4);

        if (broadWords.length > 0) {
          const candidates = await prisma.song.findMany({
            where: {
              bandId: null,
              musicianProfileId: null,
              OR: broadWords.flatMap((word) => ([
                { title: { contains: word, mode: 'insensitive' } },
                { artist: { contains: word, mode: 'insensitive' } },
              ])),
            },
            select: { id: true, title: true, artist: true, lyrics: true, category: true, type: true },
            take: 80,
          });

          let bestCandidate = null;
          let bestScore = 0;
          for (const candidate of candidates) {
            const score = scoreCandidate(candidate, titleToSearch, artistToSearch, cleaned);
            if (score > bestScore) {
              bestCandidate = candidate;
              bestScore = score;
            }
          }

          if (bestCandidate && bestScore >= 45) {
            match = bestCandidate;
          }
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
              lyrics: match.lyrics,
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
