import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { requireAdmin } from '../../../../lib/adminAuth';
import { responseFromDatabaseError } from '../../../../lib/dbClientErrors';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 100;

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20)
  );
  const search = String(searchParams.get('search') || '').trim();
  const skip = (page - 1) * limit;

  try {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
            { genre: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, bands] = await Promise.all([
      prisma.band.count({ where }),
      prisma.band.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        select: {
          id: true,
          name: true,
          genre: true,
          location: true,
          rating: true,
          img: true,
          isPaid: true,
          plan: true,
          user: { select: { email: true, id: true } },
          _count: { select: { songs: true, bookings: true, reviews: true } },
        },
      }),
    ]);

    return NextResponse.json({
      bands,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('admin/bands GET', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri učitavanju bendova.' }, { status: 500 });
  }
}
