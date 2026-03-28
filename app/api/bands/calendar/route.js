import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const bandId = searchParams.get('bandId');

  if (!bandId) {
    return NextResponse.json({ error: 'Missing bandId' }, { status: 400 });
  }

  try {
    const busyManual = await prisma.busyDate.findMany({
      where: { bandId },
    });

    const confirmedBookings = await prisma.booking.findMany({
      where: { bandId, status: 'CONFIRMED' },
      select: { date: true, id: true, clientName: true },
    });

    const allBusy = [
      ...busyManual.map((b) => b.date.toISOString().split('T')[0]),
      ...confirmedBookings.map((b) => b.date.toISOString().split('T')[0]),
    ];

    return NextResponse.json({ busyDates: busyManual, confirmedBookings, allBusy });
  } catch (error) {
    console.error('Calendar Fetch Error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { bandId, date, reason, action } = await request.json();

    if (!bandId || !date) {
      return NextResponse.json({ error: 'Missing core data' }, { status: 400 });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    if (action === 'TOGGLE') {
      const existing = await prisma.busyDate.findFirst({
        where: { bandId, date: targetDate },
      });

      if (existing) {
        await prisma.busyDate.delete({ where: { id: existing.id } });
        return NextResponse.json({ message: 'Date unmarked', isBusy: false });
      } else {
        await prisma.busyDate.create({
          data: { bandId, date: targetDate, reason: reason || 'Privatno' },
        });
        return NextResponse.json({ message: 'Date marked busy', isBusy: true });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Calendar Update Error:', error);
    return NextResponse.json({ error: 'Failed to update calendar' }, { status: 500 });
  }
}
