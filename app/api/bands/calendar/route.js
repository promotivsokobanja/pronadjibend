import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { dateToCalendarKeyUTC, parseCalendarDateParam } from '../../../../lib/calendarDate';

export const dynamic = 'force-dynamic';

const MAX_REASON_LEN = 200;

function normalizeReason(reason) {
  if (reason == null) return null;
  const s = String(reason).trim();
  if (!s) return null;
  return s.slice(0, MAX_REASON_LEN);
}

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
      ...busyManual.map((b) => dateToCalendarKeyUTC(b.date)),
      ...confirmedBookings.map((b) => dateToCalendarKeyUTC(b.date)),
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

    const targetDate = parseCalendarDateParam(date);
    if (!targetDate) {
      return NextResponse.json({ error: 'Neispravan datum.' }, { status: 400 });
    }

    if (action === 'TOGGLE') {
      const dayEnd = new Date(targetDate.getTime() + 86400000);
      const existing = await prisma.busyDate.findFirst({
        where: {
          bandId,
          date: { gte: targetDate, lt: dayEnd },
        },
      });

      if (existing) {
        await prisma.busyDate.delete({ where: { id: existing.id } });
        return NextResponse.json({ message: 'Date unmarked', isBusy: false });
      }
      const note = normalizeReason(reason);
      await prisma.busyDate.create({
        data: { bandId, date: targetDate, reason: note },
      });
      return NextResponse.json({ message: 'Date marked busy', isBusy: true });
    }

    if (action === 'UPDATE_NOTE') {
      const dayEnd = new Date(targetDate.getTime() + 86400000);
      const existing = await prisma.busyDate.findFirst({
        where: {
          bandId,
          date: { gte: targetDate, lt: dayEnd },
        },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Nema ručnog zauzeća za taj datum.' }, { status: 404 });
      }
      await prisma.busyDate.update({
        where: { id: existing.id },
        data: { reason: normalizeReason(reason) },
      });
      return NextResponse.json({ message: 'Napomena ažurirana', isBusy: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Calendar Update Error:', error);
    return NextResponse.json({ error: 'Failed to update calendar' }, { status: 500 });
  }
}
