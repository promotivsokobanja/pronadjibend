import prisma from '../../../lib/prisma';
import { NextResponse } from 'next/server';
import { cleanLyrics } from '../../../lib/cleanLyrics';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const letter = searchParams.get('letter') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 50;
    const skip = (page - 1) * limit;

    const where = {
      lyrics: { not: null },
      bandId: null,
    };

    if (category && category !== 'Sve') {
      where.category = category;
    }

    if (letter) {
      where.title = { startsWith: letter, mode: 'insensitive' };
    }

    if (search.length >= 2) {
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
      delete where.title;
    }

    const [songs, total, catCounts] = await Promise.all([
      prisma.song.findMany({
        where,
        select: {
          id: true,
          title: true,
          artist: true,
          lyrics: true,
          category: true,
        },
        orderBy: { title: 'asc' },
        skip,
        take: limit,
      }),
      prisma.song.count({ where }),
      prisma.song.groupBy({
        by: ['category'],
        where: { lyrics: { not: null }, bandId: null },
        _count: true,
      }),
    ]);

    const counts = {};
    let totalAll = 0;
    for (const c of catCounts) {
      counts[c.category] = c._count;
      totalAll += c._count;
    }
    counts['Sve'] = totalAll;

    const cleanedSongs = songs.map((s) => ({ ...s, lyrics: cleanLyrics(s.lyrics) }));

    return NextResponse.json({
      songs: cleanedSongs,
      total,
      page,
      pages: Math.ceil(total / limit),
      counts,
    });
  } catch (error) {
    console.error('Pesmarica API Error:', error);
    return NextResponse.json({ error: 'Greška pri pretrazi.' }, { status: 500 });
  }
}
