import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const COUNT_ALIAS_TARGET = {
  Zabavne: 'Muške Zabavne',
  Narodne: 'Muške Narodne',
  Strane: 'Starije Zabavne',
};

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
      const categoryKey = item.category || '';
      const targetKey = COUNT_ALIAS_TARGET[categoryKey] || categoryKey;
      acc[targetKey] = (acc[targetKey] || 0) + item._count.id;
      return acc;
    }, {});

    return NextResponse.json(formattedCounts);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch counts' }, { status: 500 });
  }
}
