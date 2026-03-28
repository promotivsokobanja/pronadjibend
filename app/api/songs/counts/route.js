import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bandId = searchParams.get('bandId');
    const where = bandId ? { bandId } : {};

    const counts = await prisma.song.groupBy({
      by: ['category'],
      where,
      _count: { id: true },
    });

    const formattedCounts = counts.reduce((acc, item) => {
      acc[item.category] = item._count.id;
      return acc;
    }, {});

    return NextResponse.json(formattedCounts);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch counts' }, { status: 500 });
  }
}
