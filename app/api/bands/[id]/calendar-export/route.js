import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

export const dynamic = 'force-dynamic';

function toICSDate(date) {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export async function GET(request) {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const bandId = segments[segments.indexOf('bands') + 1];

  if (!bandId) {
    return NextResponse.json({ error: 'Band ID required' }, { status: 400 });
  }

  const band = await prisma.band.findUnique({
    where: { id: bandId },
    select: { name: true },
  });

  if (!band) {
    return NextResponse.json({ error: 'Band not found' }, { status: 404 });
  }

  const bookings = await prisma.booking.findMany({
    where: { bandId, status: 'CONFIRMED' },
    orderBy: { date: 'asc' },
  });

  const busyDates = await prisma.busyDate.findMany({
    where: { bandId },
  });

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PronadjiBend//Calendar//SR',
    `X-WR-CALNAME:${band.name} - Nastupi`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const b of bookings) {
    const dateStr = toICSDate(b.date);
    const endDate = toICSDate(new Date(new Date(b.date).getTime() + 4 * 3600000)); // +4h
    ics.push(
      'BEGIN:VEVENT',
      `DTSTART:${dateStr}`,
      `DTEND:${endDate}`,
      `SUMMARY:Nastup - ${b.clientName || b.clientEmail || 'Klijent'}`,
      `DESCRIPTION:Lokacija: ${b.location || 'N/A'}`,
      `LOCATION:${b.location || ''}`,
      `UID:booking-${b.id}@pronadjibend.rs`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    );
  }

  for (const bd of busyDates) {
    const dateStr = toICSDate(bd.date);
    const endDate = toICSDate(new Date(new Date(bd.date).getTime() + 86400000));
    ics.push(
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${dateStr.split('T')[0]}`,
      `DTEND;VALUE=DATE:${endDate.split('T')[0]}`,
      `SUMMARY:Zauzeto${bd.note ? ' - ' + bd.note : ''}`,
      `UID:busy-${bd.id}@pronadjibend.rs`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT',
    );
  }

  ics.push('END:VCALENDAR');

  return new Response(ics.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${band.name.replace(/[^a-zA-Z0-9]/g, '_')}_calendar.ics"`,
    },
  });
}
