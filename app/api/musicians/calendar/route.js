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
  const musicianId = searchParams.get('musicianId');

  if (!musicianId) {
    return NextResponse.json({ error: 'Missing musicianId' }, { status: 400 });
  }

  try {
    // Treat MusicianAvailability rows with isAvailable=false as busy dates
    const busyRows = await prisma.musicianAvailability.findMany({
      where: { musicianId, isAvailable: false },
    });

    const busyDates = busyRows.map((row) => ({ id: row.id, date: row.date, reason: row.note || null }));
    const allBusy = busyRows.map((r) => dateToCalendarKeyUTC(r.date));

    return NextResponse.json({ busyDates, confirmedBookings: [], allBusy });
  } catch (error) {
    console.error('Musician calendar fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { musicianId, date, reason, action } = await request.json();

    if (!musicianId || !date) {
      return NextResponse.json({ error: 'Missing core data' }, { status: 400 });
    }

    const targetDate = parseCalendarDateParam(date);
    if (!targetDate) {
      return NextResponse.json({ error: 'Neispravan datum.' }, { status: 400 });
    }

    if (action === 'TOGGLE') {
      const dayEnd = new Date(targetDate.getTime() + 86400000);
      const existing = await prisma.musicianAvailability.findFirst({
        where: {
          musicianId,
          isAvailable: false,
          date: { gte: targetDate, lt: dayEnd },
        },
      });

      if (existing) {
        await prisma.musicianAvailability.delete({ where: { id: existing.id } });
        return NextResponse.json({ message: 'Date unmarked', isBusy: false });
      }
      const note = normalizeReason(reason);
      await prisma.musicianAvailability.create({
        data: { musicianId, date: targetDate, isAvailable: false, note },
      });
      return NextResponse.json({ message: 'Date marked busy', isBusy: true });
    }

    if (action === 'UPDATE_NOTE') {
      const dayEnd = new Date(targetDate.getTime() + 86400000);
      const existing = await prisma.musicianAvailability.findFirst({
        where: {
          musicianId,
          isAvailable: false,
          date: { gte: targetDate, lt: dayEnd },
        },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Nema ručnog zauzeća za taj datum.' }, { status: 404 });
      }
      await prisma.musicianAvailability.update({
        where: { id: existing.id },
        data: { note: normalizeReason(reason) },
      });
      return NextResponse.json({ message: 'Napomena ažurirana', isBusy: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Musician calendar update error:', error);
    return NextResponse.json({ error: 'Failed to update calendar' }, { status: 500 });
  }
}
