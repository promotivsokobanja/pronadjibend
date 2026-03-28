import prisma from '../../../lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 40;
    const skip = (page - 1) * limit;

    const where = {
      lyrics: { not: null },
    };

    if (search.length >= 2) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { artist: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        select: {
          id: true,
          title: true,
          artist: true,
          lyrics: true,
          category: true,
          type: true,
        },
        orderBy: { title: 'asc' },
        distinct: ['title', 'artist'],
        skip,
        take: limit,
      }),
      prisma.song.count({ where }),
    ]);

    return NextResponse.json({
      songs,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Pesmarica API Error:', error);
    return NextResponse.json({ error: 'Greška pri pretrazi.' }, { status: 500 });
  }
}
