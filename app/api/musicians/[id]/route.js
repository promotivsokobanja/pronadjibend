import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDemoMusicians } from '@/lib/demoMusicians';

export const dynamic = 'force-dynamic';

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
    availabilities: Array.isArray(raw.availabilities) ? raw.availabilities : [],
    songs: Array.isArray(raw.songs) ? raw.songs : [],
    source: raw.source || 'db',
  };
}

function findDemoMusician(id) {
  const demos = getDemoMusicians();
  const found = demos.find((item) => item.id === id);
  return found ? normalizeMusician({ ...found, source: 'demo' }) : null;
}

export async function GET(request, { params } = {}) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID je obavezan.' }, { status: 400 });
  }

  if (String(id).startsWith('demo-musician-')) {
    const demo = findDemoMusician(id);
    if (!demo) {
      return NextResponse.json({ error: 'Muzičar nije pronađen.' }, { status: 404 });
    }
    return NextResponse.json(demo);
  }

  try {
    let musician = await prisma.musicianProfile.findUnique({
      where: { id: String(id) },
      include: {
        availabilities: {
          where: {
            date: { gte: new Date() },
          },
          orderBy: { date: 'asc' },
          take: 30,
          select: { date: true, isAvailable: true, note: true },
        },
      },
    });

    if (!musician) {
      musician = await prisma.musicianProfile.findUnique({
        where: { userId: String(id) },
        include: {
          availabilities: {
            where: {
              date: { gte: new Date() },
            },
            orderBy: { date: 'asc' },
            take: 30,
            select: { date: true, isAvailable: true, note: true },
          },
        },
      });
    }

    if (!musician || musician.deletedAt) {
      const demoFallback = findDemoMusician(id);
      if (demoFallback) return NextResponse.json(demoFallback);
      return NextResponse.json({ error: 'Muzičar nije pronađen.' }, { status: 404 });
    }

    // Attach repertoire only if premium user + showRepertoire enabled
    let songs = [];
    if (musician.showRepertoire && musician.userId) {
      const user = await prisma.user.findUnique({
        where: { id: musician.userId },
        select: { plan: true },
      });
      const planUpper = String(user?.plan || '').toUpperCase();
      if (planUpper === 'PREMIUM' || planUpper === 'PREMIUM_VENUE') {
        songs = await prisma.song.findMany({
          where: { musicianProfileId: musician.id },
          select: { id: true, title: true, artist: true, category: true, type: true },
          orderBy: [{ category: 'asc' }, { title: 'asc' }],
        });
      }
    }

    return NextResponse.json(normalizeMusician({ ...musician, songs, source: 'db' }));
  } catch (error) {
    console.error('Musician detail API error:', error);
    return NextResponse.json({ error: 'Greška pri učitavanju muzičara.' }, { status: 500 });
  }
}
