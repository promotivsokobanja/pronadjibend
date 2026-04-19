import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDemoMusicians } from '@/lib/demoMusicians';

export const dynamic = 'force-dynamic';

function toNumber(value) {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function includesText(haystack, needle) {
  if (!needle) return true;
  return String(haystack || '').toLowerCase().includes(String(needle).toLowerCase());
}

function matchesDateAvailability(musician, eventDate) {
  if (!eventDate) return true;
  if (musician.isAvailable === false) return false;

  const parsed = new Date(`${eventDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return true;
  const targetKey = parsed.toISOString().slice(0, 10);

  if (!Array.isArray(musician.availabilities) || musician.availabilities.length === 0) return true;

  const explicit = musician.availabilities.find((item) => {
    const d = new Date(item.date);
    if (Number.isNaN(d.getTime())) return false;
    return d.toISOString().slice(0, 10) === targetKey;
  });

  if (!explicit) return true;
  return explicit.isAvailable !== false;
}

function normalizeMusician(raw) {
  return {
    id: raw.id,
    name: raw.name,
    primaryInstrument: raw.primaryInstrument,
    genres: raw.genres || '',
    city: raw.city,
    priceFromEur: raw.priceFromEur,
    priceToEur: raw.priceToEur,
    experienceYears: raw.experienceYears,
    bio: raw.bio,
    img: raw.img,
    videoUrl: raw.videoUrl,
    rating: raw.rating ?? 0,
    isFeatured: Boolean(raw.isFeatured),
    isAvailable: raw.isAvailable !== false,
    source: raw.source || 'db',
    availabilities: Array.isArray(raw.availabilities) ? raw.availabilities : [],
  };
}

function applyFilters(list, { search, instrument, city, maxBudget, eventDate }) {
  return list.filter((m) => {
    if (!matchesDateAvailability(m, eventDate)) return false;

    const searchableText = `${m.name} ${m.primaryInstrument} ${m.genres} ${m.city} ${m.bio || ''}`;
    if (search && !includesText(searchableText, search)) return false;
    if (instrument && !includesText(m.primaryInstrument, instrument) && !includesText(m.genres, instrument)) return false;
    if (city && !includesText(m.city, city)) return false;

    if (maxBudget != null) {
      const musicianMin = toNumber(m.priceFromEur);
      if (musicianMin != null && musicianMin > maxBudget) return false;
    }

    return true;
  });
}

function sortMusicians(list, sortBy) {
  const copy = [...list];
  if (sortBy === 'rating') {
    copy.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return copy;
  }
  if (sortBy === 'priceAsc') {
    copy.sort((a, b) => {
      const aPrice = toNumber(a.priceFromEur) ?? Number.MAX_SAFE_INTEGER;
      const bPrice = toNumber(b.priceFromEur) ?? Number.MAX_SAFE_INTEGER;
      return aPrice - bPrice;
    });
    return copy;
  }
  if (sortBy === 'name') {
    copy.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    return copy;
  }

  copy.sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
    return (b.rating || 0) - (a.rating || 0);
  });
  return copy;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const search = (searchParams.get('search') || '').trim();
  const instrument = (searchParams.get('instrument') || '').trim();
  const city = (searchParams.get('city') || '').trim();
  const eventDate = (searchParams.get('eventDate') || '').trim();
  const sort = (searchParams.get('sort') || 'recommended').trim();
  const maxBudget = toNumber(searchParams.get('maxBudget'));
  const includeRepertoire = searchParams.get('includeRepertoire') === '1' || searchParams.get('includeRepertoire') === 'true';

  const hasFilters = Boolean(search || instrument || city || eventDate || maxBudget != null || sort !== 'recommended');

  try {
    let dbMusicians = [];
    try {
      const fromDb = await prisma.musicianProfile.findMany({
        where: {
          AND: [
            { deletedAt: null },
            search
              ? {
                  OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { primaryInstrument: { contains: search, mode: 'insensitive' } },
                    { genres: { contains: search, mode: 'insensitive' } },
                    { city: { contains: search, mode: 'insensitive' } },
                    { bio: { contains: search, mode: 'insensitive' } },
                  ],
                }
              : {},
            instrument
              ? {
                  OR: [
                    { primaryInstrument: { contains: instrument, mode: 'insensitive' } },
                    { genres: { contains: instrument, mode: 'insensitive' } },
                  ],
                }
              : {},
            city ? { city: { contains: city, mode: 'insensitive' } } : {},
            maxBudget != null ? { OR: [{ priceFromEur: null }, { priceFromEur: { lte: maxBudget } }] } : {},
          ],
        },
        include: {
          availabilities: eventDate
            ? {
                where: {
                  date: {
                    gte: new Date(`${eventDate}T00:00:00.000Z`),
                    lt: new Date(`${eventDate}T23:59:59.999Z`),
                  },
                },
                select: { date: true, isAvailable: true },
              }
            : false,
          songs: includeRepertoire && !eventDate
            ? {
                select: {
                  id: true,
                  title: true,
                  artist: true,
                  category: true,
                },
                orderBy: { title: 'asc' },
              }
            : false,
        },
      });

      dbMusicians = fromDb.map((item) => {
        const normalized = normalizeMusician({ ...item, source: 'db' });
        // Filter songs: only include for premium musicians with showRepertoire enabled
        if (includeRepertoire) {
          normalized.songs = (item.plan === 'PREMIUM' && item.showRepertoire) ? item.songs || [] : [];
        }
        return normalized;
      });
    } catch (dbError) {
      console.error('Musicians DB read error:', dbError);
    }

    const demoMusicians = getDemoMusicians().map((item) => normalizeMusician({ ...item, source: 'demo' }));
    const merged = [...dbMusicians, ...demoMusicians];

    const filtered = applyFilters(merged, { search, instrument, city, maxBudget, eventDate });
    const sorted = sortMusicians(filtered, sort);

    const headers = new Headers();
    if (!hasFilters) {
      headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    }

    return NextResponse.json(sorted, { headers });
  } catch (error) {
    console.error('Musicians API error:', error);
    return NextResponse.json({ error: 'Failed to fetch musicians' }, { status: 500 });
  }
}
