import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { isDemoBandId } from '../../../lib/demoBands';
import { sendBookingNotificationToBand } from '../../../lib/sendBookingNotificationEmail';

export async function POST(request) {
  try {
    const { bandId, clientName, clientEmail, clientPhone, date, message, location } =
      await request.json();

    if (!bandId || !date || !clientEmail) {
      return NextResponse.json(
        { error: 'Nedostaju obavezni podaci (Bend, Datum, Email).' },
        { status: 400 }
      );
    }

    if (isDemoBandId(bandId)) {
      return NextResponse.json(
        {
          error:
            'Ovo je demo profil za prezentaciju. Kada se bend registruje na platformi, ovde će raditi prava rezervacija.',
        },
        { status: 400 }
      );
    }

    const busyDate = await prisma.busyDate.findFirst({
      where: { bandId, date: new Date(date) },
    });

    if (busyDate) {
      return NextResponse.json({ error: 'Bend je zauzet na traženi datum.' }, { status: 409 });
    }

    const booking = await prisma.booking.create({
      data: {
        bandId,
        clientName,
        clientEmail,
        clientPhone,
        date: new Date(date),
        message,
        location,
        status: 'PENDING',
      },
    });

    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: { name: true, user: { select: { email: true } } },
    });

    try {
      await sendBookingNotificationToBand({
        bandEmail: band?.user?.email,
        bandName: band?.name || 'Bend',
        booking,
      });
    } catch (mailErr) {
      console.error('[booking-email] Slanje mejla nije uspelo:', mailErr);
    }

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error('Booking Error:', error);
    return NextResponse.json({ error: 'Greška pri slanju upita.' }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const bandId = searchParams.get('bandId');

  if (!bandId) return NextResponse.json({ error: 'Band ID required' }, { status: 400 });

  try {
    const bookings = await prisma.booking.findMany({
      where: { bandId },
      orderBy: { date: 'asc' },
    });
    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching bookings' }, { status: 500 });
  }
}
