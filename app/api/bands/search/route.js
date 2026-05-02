import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDemoBands } from '@/lib/demoBands';
import { getShowDemoBands } from '@/lib/siteConfig';

/**
 * GET /api/bands/search?q=<natural language query>
 *
 * AI-Ready endpoint — parses free-text queries and maps them to structured
 * Prisma filters. Designed for chatbot / AI agent consumption.
 *
 * Query params:
 *   q          — free text, e.g. "bend za svadbu u Beogradu do 800 eura"
 *   limit      — max results (default 10, max 50)
 *   offset     — pagination offset (default 0)
 *
 * Response shape:
 * {
 *   query: { raw, parsed: { genres, location, eventType, budgetMax, keywords } },
 *   total: number,
 *   bands: [ { id, name, genre, location, rating, priceRange, bio, img } ]
 * }
 */

// ── NLP dictionaries ──────────────────────────────────────────────────────────

const GENRE_MAP = {
  folk: ['folk', 'narodna', 'narodn', 'sevdah', 'starogradska', 'trubač', 'trubaci', 'truba'],
  pop: ['pop', 'popsk'],
  rock: ['rock', 'rok', 'rocksk'],
  jazz: ['jazz', 'džez', 'dzez'],
  electronic: ['elektro', 'dj', 'house', 'dance', 'techno'],
  classical: ['klasič', 'klasicn', 'klasika', 'orkestar', 'simfon'],
  covers: ['cover', 'kaver', 'evergreen', 'oldies'],
};

const EVENT_MAP = {
  svadba: ['svadba', 'svadben', 'venčanje', 'vencanje', 'venčan', 'mladenci', 'prsten', 'wedding'],
  rodjendan: ['rođendan', 'rodjendan', 'birthday', 'proslava', 'proslav'],
  korporativno: ['korporativ', 'firma', 'kompanij', 'poslovn', 'team building', 'event'],
  restoran: ['restoran', 'kafan', 'kafić', 'kafic', 'kafe', 'ugostiteljsk'],
  hotel: ['hotel', 'sala', 'bančet', 'bancet'],
  festival: ['festival', 'koncert', 'manifestacij', 'bina', 'open air'],
};

const CITY_ALIASES = {
  'novi sad': ['novi sad', 'novisad', 'ns'],
  beograd: ['beograd', 'bg', 'bgd', 'belgrade'],
  niš: ['niš', 'nis', 'nish'],
  kragujevac: ['kragujevac', 'kg'],
  subotica: ['subotica'],
  sokobanja: ['sokobanja'],
  zlatibor: ['zlatibor'],
  kopaonik: ['kopaonik'],
};

// ── NLP Parser ────────────────────────────────────────────────────────────────

function parseQuery(raw) {
  if (!raw || typeof raw !== 'string') return {};
  const q = raw.toLowerCase().normalize('NFC');

  // Genres
  const genres = [];
  for (const [genre, keywords] of Object.entries(GENRE_MAP)) {
    if (keywords.some((k) => q.includes(k))) genres.push(genre);
  }

  // Event type
  let eventType = null;
  for (const [type, keywords] of Object.entries(EVENT_MAP)) {
    if (keywords.some((k) => q.includes(k))) { eventType = type; break; }
  }

  // Location — try alias map first, then extract city-like word after "u "
  let location = null;
  for (const [canonical, aliases] of Object.entries(CITY_ALIASES)) {
    if (aliases.some((a) => q.includes(a))) { location = canonical; break; }
  }
  if (!location) {
    const cityMatch = q.match(/\bu\s+([a-zšđčćž]+(?:\s+[a-zšđčćž]+)?)/);
    if (cityMatch) location = cityMatch[1].trim();
  }

  // Budget — extract number near "eura", "eur", "€", "din", "rsd"
  let budgetMax = null;
  const budgetMatch = q.match(/(\d[\d.]*)\s*(?:€|eur|eura|din|rsd)/i)
    || q.match(/(?:do|max|maksimalno|najviše|najvise)\s+(\d[\d.]*)/i);
  if (budgetMatch) {
    const num = parseFloat(budgetMatch[1].replace(/\./g, ''));
    if (Number.isFinite(num) && num > 0) budgetMax = num;
  }

  // Equipment
  const wantsEquipment = /\b(oprema|rider|pa sistem|zvučnici|zvucnici|ozvučenje|ozvucenje)\b/.test(q);

  // Remaining keywords for full-text search (strip stop words)
  const stopWords = new Set([
    'bend', 'muzičar', 'muzičari', 'muzika', 'za', 'u', 'i', 'na', 'sa', 'do',
    'koji', 'koja', 'koje', 'tražim', 'trazim', 'hoću', 'hocu', 'želim', 'zelim',
    'trebam', 'treba', 'molim', 'preporuči', 'preporuci', 'nađi', 'nadji', 'pronađi', 'pronadji',
  ]);
  const keywords = q
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
    .slice(0, 5);

  return { genres, location, eventType, budgetMax, wantsEquipment, keywords };
}

// ── Budget matching helper ────────────────────────────────────────────────────

function extractMaxEuro(priceRange) {
  if (!priceRange) return null;
  const text = String(priceRange).replace(/\./g, '').replace(/,/g, '.');
  const matches = Array.from(text.matchAll(/(\d+(?:\.\d+)?)\s*€/g));
  const nums = matches.map((m) => Number(m[1])).filter(Number.isFinite);
  return nums.length ? Math.max(...nums) : null;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('q') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

  const parsed = parseQuery(raw);
  const { genres, location, budgetMax, wantsEquipment, keywords } = parsed;

  const includeDemos = await getShowDemoBands();

  try {
    // Build Prisma where clause
    const andClauses = [{ deletedAt: null }];

    if (genres.length > 0) {
      andClauses.push({
        OR: genres.map((g) => ({ genre: { contains: g, mode: 'insensitive' } })),
      });
    }

    if (location) {
      andClauses.push({ location: { contains: location, mode: 'insensitive' } });
    }

    if (wantsEquipment) {
      andClauses.push({ hasEquipment: true });
    }

    if (keywords.length > 0) {
      andClauses.push({
        OR: keywords.flatMap((kw) => [
          { name: { contains: kw, mode: 'insensitive' } },
          { genre: { contains: kw, mode: 'insensitive' } },
          { location: { contains: kw, mode: 'insensitive' } },
          { bio: { contains: kw, mode: 'insensitive' } },
        ]),
      });
    }

    let bands = await prisma.band.findMany({
      where: { AND: andClauses },
      select: {
        id: true,
        name: true,
        genre: true,
        location: true,
        rating: true,
        priceRange: true,
        bio: true,
        img: true,
        hasEquipment: true,
      },
      orderBy: { rating: 'desc' },
    });

    // Post-filter by budget (done in JS since priceRange is a free-text string)
    if (budgetMax) {
      bands = bands.filter((b) => {
        const max = extractMaxEuro(b.priceRange);
        return max === null || max <= budgetMax;
      });
    }

    // Merge demo bands if enabled and no DB results
    if (includeDemos && bands.length === 0) {
      let demos = getDemoBands();
      if (genres.length > 0) demos = demos.filter((b) => genres.some((g) => b.genre?.toLowerCase().includes(g)));
      if (location) demos = demos.filter((b) => b.location?.toLowerCase().includes(location));
      bands = demos;
    }

    const total = bands.length;
    const page = bands.slice(offset, offset + limit);

    return NextResponse.json({
      query: { raw, parsed },
      total,
      bands: page,
    });
  } catch (err) {
    console.error('AI search error:', err);
    return NextResponse.json({ error: 'Greška pri pretrazi.' }, { status: 500 });
  }
}
