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

  const titleCompact = normalizedTitle.replace(/\s+/g, '');
  const candidateTitleCompact = candidateTitle.replace(/\s+/g, '');
  const artistCompact = normalizedArtist.replace(/\s+/g, '');
  const candidateArtistCompact = candidateArtist.replace(/\s+/g, '');

  const titleDistance = levenshteinDistance(titleCompact, candidateTitleCompact);
  const titleSimilarity = titleCompact && candidateTitleCompact
    ? 1 - (titleDistance / Math.max(titleCompact.length, candidateTitleCompact.length))
    : 0;
  if (titleSimilarity >= 0.86) score += 80;
  else if (titleSimilarity >= 0.72) score += 45;
  else if (titleSimilarity >= 0.6) score += 20;

  const artistDistance = artistCompact && candidateArtistCompact
    ? levenshteinDistance(artistCompact, candidateArtistCompact)
    : 999;
  const artistSimilarity = artistCompact && candidateArtistCompact
    ? 1 - (artistDistance / Math.max(artistCompact.length, candidateArtistCompact.length))
    : 0;
  if (artistSimilarity >= 0.7) score += 35;

  return score;
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function pickBestCandidate(candidates, titleToSearch, artistToSearch, cleaned, minScore = 45) {
  let bestCandidate = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = scoreCandidate(candidate, titleToSearch, artistToSearch, cleaned);
    if (score > bestScore) {
      bestCandidate = candidate;
      bestScore = score;
    }
  }

  return bestCandidate && bestScore >= minScore ? bestCandidate : null;
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

    // Process lines in parallel to avoid serverless timeout
    const processLine = async (rawLine) => {
      const cleaned = stripLeadingNumber(rawLine);
      if (!cleaned) return null;

      const parts = splitTitleArtist(cleaned);
      const titleToSearch = parts ? parts.left : cleaned;
      const artistToSearch = parts ? parts.right : '';

      let match = null;

      if (!match) {
        for (const variant of buildSearchVariants(titleToSearch)) {
          const found = await prisma.song.findMany({
            where: {
              bandId: null,
              musicianProfileId: null,
              title: { equals: variant, mode: 'insensitive' },
            },
            select: { id: true, title: true, artist: true, lyrics: true, category: true, type: true },
            take: 20,
          });
          match = pickBestCandidate(found, titleToSearch, artistToSearch, cleaned, 35);
          if (match) break;
        }
      }

      if (!match && parts) {
        for (const variant of buildSearchVariants(parts.right)) {
          const found = await prisma.song.findMany({
            where: {
              bandId: null,
              musicianProfileId: null,
              title: { equals: variant, mode: 'insensitive' },
            },
            select: { id: true, title: true, artist: true, lyrics: true, category: true, type: true },
            take: 20,
          });
          match = pickBestCandidate(found, parts.right, parts.left, cleaned, 35);
          if (match) break;
        }
      }

      if (!match) {
        if (normalizeText(titleToSearch).length >= 3) {
          const found = await prisma.song.findMany({
            where: {
              bandId: null,
              musicianProfileId: null,
              AND: buildWordClauses(titleToSearch, ['title']),
            },
            select: { id: true, title: true, artist: true, lyrics: true, category: true, type: true },
            take: 40,
          });
          match = pickBestCandidate(found, titleToSearch, artistToSearch, cleaned, 30);
        }
      }

      if (!match) {
        const found = await prisma.song.findMany({
          where: {
            bandId: null,
            musicianProfileId: null,
            AND: buildWordClauses(cleaned, ['title', 'artist']),
          },
          select: { id: true, title: true, artist: true, lyrics: true, category: true, type: true },
          take: 50,
        });
        match = pickBestCandidate(found, titleToSearch, artistToSearch, cleaned, 30);
      }

      const alreadyInRepertoire = match
        ? existingSet.has(`${match.title.toLowerCase()}|||${match.artist.toLowerCase()}`)
        : false;

      return {
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
      };
    };

    // Process in chunks of 5 to balance parallelism vs DB load
    const CHUNK_SIZE = 5;
    const results = [];
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      const chunk = lines.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(chunk.map(processLine));
      results.push(...chunkResults.filter(Boolean));
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error('POST /api/songs/match-bulk error:', err);
    return NextResponse.json({ error: 'Greška pri analizi liste.' }, { status: 500 });
  }
}
