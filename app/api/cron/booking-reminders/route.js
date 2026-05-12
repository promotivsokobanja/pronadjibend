import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { createNotification } from '../../../../lib/notifications';

export const dynamic = 'force-dynamic';

// GET /api/cron/booking-reminders
// Call this daily via external cron (e.g. cron-job.org) with ?secret=YOUR_CRON_SECRET
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowEnd = new Date(tomorrowStart.getTime() + 86400000);

  // Find confirmed bookings for tomorrow
  const bookings = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      date: { gte: tomorrowStart, lt: tomorrowEnd },
    },
    include: {
      band: {
        select: {
          id: true,
          name: true,
          user: { select: { id: true, email: true } },
        },
      },
    },
  });

  let notifCount = 0;

  for (const booking of bookings) {
    const dateStr = booking.date.toISOString().split('T')[0];

    // Notification for band
    if (booking.band?.user?.id) {
      await createNotification({
        userId: booking.band.user.id,
        type: 'SYSTEM',
        title: `Podsetnik: Nastup sutra (${dateStr})`,
        body: `Klijent: ${booking.clientName || booking.clientEmail}${booking.location ? ` • ${booking.location}` : ''}`,
        link: '/bands#bookings',
      });
      notifCount++;
    }
  }

  return NextResponse.json({
    ok: true,
    bookingsFound: bookings.length,
    notificationsSent: notifCount,
  });
}
