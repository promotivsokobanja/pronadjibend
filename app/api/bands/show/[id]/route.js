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
        busyDates: true
      }
    });

    if (!band) {
      return NextResponse.json({ error: 'Band not found' }, { status: 404 });
    }

    return NextResponse.json(band);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch band' }, { status: 500 });
  }
}
