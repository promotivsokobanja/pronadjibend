import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: { bandId: true, role: true },
  });

  if (!user?.bandId) {
    return NextResponse.json({ error: 'Nema povezanog benda.' }, { status: 403 });
  }

  const bandId = user.bandId;

  const [band, totalBookings, confirmedBookings, pendingBookings, totalReviews, totalSongs, unreadMessages] = await Promise.all([
    prisma.band.findUnique({
      where: { id: bandId },
      select: { profileViews: true, rating: true, name: true },
    }),
    prisma.booking.count({ where: { bandId } }),
    prisma.booking.count({ where: { bandId, status: 'CONFIRMED' } }),
    prisma.booking.count({ where: { bandId, status: 'PENDING' } }),
    prisma.review.count({ where: { bandId } }),
    prisma.song.count({ where: { bandId } }),
    prisma.contactMessage.count({ where: { bandId, read: false } }),
  ]);

  // Monthly bookings for last 6 months
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const recentBookings = await prisma.booking.findMany({
    where: { bandId, createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true, status: true },
  });

  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleString('sr-Latn', { month: 'short', year: 'numeric' });
    const count = recentBookings.filter((b) => {
      const bd = new Date(b.createdAt);
      return bd.getFullYear() === d.getFullYear() && bd.getMonth() === d.getMonth();
    }).length;
    monthlyData.push({ month: monthKey, label: monthLabel, bookings: count });
  }

  return NextResponse.json({
    profileViews: band?.profileViews || 0,
    rating: band?.rating || 0,
    totalBookings,
    confirmedBookings,
    pendingBookings,
    totalReviews,
    totalSongs,
    unreadMessages,
    monthlyData,
  });
}
