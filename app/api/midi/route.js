import prisma from '../../../lib/prisma';
import { NextResponse } from 'next/server';

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

    const where = {};

    if (category && category !== 'Sve') {
      where.category = category;
    }

    if (letter) {
      where.title = { startsWith: letter, mode: 'insensitive' };
    }

    if (search.length >= 2) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { artist: { contains: search, mode: 'insensitive' } },
      ];
      delete where.title;
    }

    const [files, total, catCounts] = await Promise.all([
      prisma.midiFile.findMany({
        where,
        select: {
          id: true,
          title: true,
          artist: true,
          category: true,
          fileName: true,
          fileSize: true,
        },
        orderBy: { title: 'asc' },
        skip,
        take: limit,
      }),
      prisma.midiFile.count({ where }),
      prisma.midiFile.groupBy({
        by: ['category'],
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

    return NextResponse.json({ files, total, page, pages: Math.ceil(total / limit), counts });
  } catch (error) {
    console.error('MIDI API Error:', error);
    return NextResponse.json({ error: 'Greška.' }, { status: 500 });
  }
}
