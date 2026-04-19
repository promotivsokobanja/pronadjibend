import prisma from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { getDemoBandById } from '../../../../../lib/demoBands';

export const dynamic = 'force-dynamic';

export async function GET(request, { params } = {}) {
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
  }

  const demo = getDemoBandById(id);
  if (demo) {
    return NextResponse.json(demo);
  }

  try {
    const band = await prisma.band.findUnique({
      where: { id },
      include: {
        reviews: true,
        busyDates: true,
        user: { select: { plan: true } },
      }
    });

    if (!band) {
      return NextResponse.json({ error: 'Band not found' }, { status: 404 });
    }

    // Attach repertoire only if premium user + showRepertoire enabled
    let songs = [];
    const planUpper = String(band.user?.plan || '').toUpperCase();
    if ((planUpper === 'PREMIUM' || planUpper === 'PREMIUM_VENUE') && band.showRepertoire) {
      songs = await prisma.song.findMany({
        where: { bandId: id },
        select: { id: true, title: true, artist: true, category: true, type: true },
        orderBy: [{ category: 'asc' }, { title: 'asc' }],
      });
    }

    return NextResponse.json({ ...band, songs });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch band' }, { status: 500 });
  }
}
