import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { requireAdmin } from '../../../../lib/adminAuth';
import { responseFromDatabaseError } from '../../../../lib/dbClientErrors';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const [users, bands, bookings, songs, reviews, billingEvents] = await Promise.all([
      prisma.user.count(),
      prisma.band.count(),
      prisma.booking.count(),
      prisma.song.count(),
      prisma.review.count(),
      prisma.billingEvent.count(),
    ]);

    const byRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    const pendingBookings = await prisma.booking.count({
      where: { status: 'PENDING' },
    });

    return NextResponse.json({
      users,
      bands,
      bookings,
      songs,
      reviews,
      billingEvents,
      pendingBookings,
      byRole: Object.fromEntries(byRole.map((r) => [r.role, r._count.id])),
    });
  } catch (error) {
    console.error('admin/stats', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri učitavanju statistike.' }, { status: 500 });
  }
}
