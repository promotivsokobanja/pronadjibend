import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getDemoBands } from '../../../lib/demoBands';
import { getShowDemoBands } from '../../../lib/siteConfig';

const EVENT_TYPE_KEYWORDS = {
  svadba: ['svadba', 'venč', 'venc', 'wedding'],
  rodjendan: ['rođendan', 'rodjendan', 'proslav', 'birthday'],
  korporativno: ['korporativ', 'event', 'firma', 'kompan'],
  restoran: ['restoran', 'kafi', 'kafe', 'kafana'],
  hotel: ['hotel', 'sala'],
  festival: ['festival', 'manifestacij', 'bina', 'koncert'],
};

function parseBudgetRange(value) {
  switch (value) {
    case 'do500':
      return [0, 500];
    case '500-1000':
      return [500, 1000];
    case '1000-1500':
      return [1000, 1500];
    case '1500plus':
      return [1500, Infinity];
    default:
      return null;
  }
}

function extractEuroRange(priceRange) {
  if (!priceRange) return null;
  const text = String(priceRange).replace(/\./g, '').replace(/,/g, '.');
  const euroMatches = Array.from(text.matchAll(/(\d+(?:\.\d+)?)\s*€/g));
  const nums = euroMatches.map((m) => Number(m[1])).filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === 0) return null;
  if (nums.length === 1) return [nums[0], nums[0]];
  const sorted = [...nums].sort((a, b) => a - b);
  return [sorted[0], sorted[sorted.length - 1]];
}

function matchesBudget(priceRange, budget) {
  if (!budget) return true;
  const selectedRange = parseBudgetRange(budget);
  if (!selectedRange) return true;

  const bandRange = extractEuroRange(priceRange);
  if (!bandRange) return true;

  const [selectedMin, selectedMax] = selectedRange;
  const [bandMin, bandMax] = bandRange;
  return bandMax >= selectedMin && bandMin <= selectedMax;
}

function matchesEventType(band, eventType) {
  if (!eventType) return true;
  const keywords = EVENT_TYPE_KEYWORDS[eventType] || [];
  if (keywords.length === 0) return true;
  const haystack = `${band?.name || ''} ${band?.genre || ''} ${band?.bio || ''}`.toLowerCase();
  return keywords.some((word) => haystack.includes(word));
}

function isBandAvailableOnDate(band, eventDate) {
  if (!eventDate) return true;
  const parsed = new Date(`${eventDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return true;
  const targetKey = parsed.toISOString().slice(0, 10);

  if (!Array.isArray(band?.busyDates) || band.busyDates.length === 0) return true;
  return !band.busyDates.some((item) => {
    const dateVal = item?.date || item;
    const d = new Date(dateVal);
    if (Number.isNaN(d.getTime())) return false;
    return d.toISOString().slice(0, 10) === targetKey;
  });
}

function applyAdvancedFilters(bands, { eventType, budget, eventDate }) {
  return bands.filter(
    (band) =>
      matchesEventType(band, eventType) &&
      matchesBudget(band?.priceRange, budget) &&
      isBandAvailableOnDate(band, eventDate)
  );
}

function filterDemoBands(demos, { search, genre, location, equipment }) {
  let out = demos;
  if (search) {
    const q = search.toLowerCase();
    out = out.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.genre.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q)
    );
  }
  if (genre && genre !== 'Svi žanrovi') {
    const g = genre.toLowerCase();
    out = out.filter((b) => b.genre.toLowerCase().includes(g));
  }
  if (location) {
    const loc = location.toLowerCase();
    out = out.filter((b) => b.location.toLowerCase().includes(loc));
  }
  if (equipment) {
    out = out.filter((b) => b.hasEquipment);
  }
  return out;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get('genre');
  const location = searchParams.get('location');
  const search = searchParams.get('search');
  const eventType = searchParams.get('eventType');
  const budget = searchParams.get('budget');
  const eventDate = searchParams.get('eventDate');
  const equipmentParam = searchParams.get('equipment');
  const equipment = equipmentParam === '1' || equipmentParam === 'true';
  const includeRepertoire = searchParams.get('includeRepertoire') === '1' || searchParams.get('includeRepertoire') === 'true';

  const hasFilters =
    Boolean(search?.trim()) ||
    Boolean(location?.trim()) ||
    Boolean(genre && genre !== 'Svi žanrovi') ||
    equipment ||
    Boolean(eventType) ||
    Boolean(budget) ||
    Boolean(eventDate);

  const includeDemos = await getShowDemoBands();

  try {
    let dbBands = [];
    try {
      const dbQuery = {
        where: {
          AND: [
            { deletedAt: null },
            search
              ? {
                  OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { genre: { contains: search, mode: 'insensitive' } },
                    { location: { contains: search, mode: 'insensitive' } },
                    { bio: { contains: search, mode: 'insensitive' } },
                  ],
                }
              : {},
            genre && genre !== 'Svi žanrovi'
              ? { genre: { contains: genre, mode: 'insensitive' } }
              : {},
            location ? { location: { contains: location, mode: 'insensitive' } } : {},
            equipment ? { hasEquipment: true } : {},
          ]
        },
      };

      if (eventDate) {
        dbQuery.include = { busyDates: { select: { date: true } } };
      } else if (includeRepertoire) {
        dbQuery.include = {
          songs: {
            select: {
              id: true,
              title: true,
              artist: true,
              category: true,
            },
            orderBy: { title: 'asc' },
          },
        };
      }

      dbBands = await prisma.band.findMany(dbQuery);
      dbBands = applyAdvancedFilters(dbBands, { eventType, budget, eventDate });

      // Filter songs: only include for premium bands with showRepertoire enabled
      if (includeRepertoire) {
        dbBands = dbBands.map(band => ({
          ...band,
          songs: (band.plan === 'PREMIUM' && band.showRepertoire) ? band.songs : []
        }));
      }
    } catch (dbErr) {
      console.error('DB Error (falling back to demos only):', dbErr);
    }

    const demos = includeDemos
      ? applyAdvancedFilters(
          filterDemoBands(getDemoBands(), { search, genre, location, equipment }),
          { eventType, budget, eventDate }
        )
      : [];
    const combined = [...dbBands, ...demos];

    const headers = new Headers();
    if (!hasFilters) {
      headers.set(
        'Cache-Control',
        'public, s-maxage=60, stale-while-revalidate=300'
      );
    }

    return NextResponse.json(combined, { headers });
  } catch (error) {
    console.error('API Error:', error);
    try {
      if (!includeDemos) {
        return NextResponse.json([]);
      }
      const demos = applyAdvancedFilters(
        filterDemoBands(getDemoBands(), { search, genre, location, equipment }),
        { eventType, budget, eventDate }
      );
      return NextResponse.json(demos);
    } catch {
      return NextResponse.json({ error: 'Failed to fetch bands' }, { status: 500 });
    }
  }
}
