import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../lib/auth';
import { parseCalendarDateParam } from '../../../lib/calendarDate';
import { isDemoBandId } from '../../../lib/demoBands';
import { sendBookingNotificationToBand } from '../../../lib/sendBookingNotificationEmail';

const BOOKING_MESSAGE_MAX = 500;
const MAX_BOOKING_DATES = 14;

export async function POST(request) {
  try {
    const body = await request.json();
    const { bandId, clientName, clientEmail, clientPhone, date, dates, message, location } = body;

    if (!bandId || !clientEmail) {
      return NextResponse.json(
        { error: 'Nedostaju obavezni podaci (Bend, Email).' },
        { status: 400 }
      );
    }

    const rawList =
      Array.isArray(dates) && dates.length > 0
        ? dates
        : date != null && String(date).trim() !== ''
          ? [date]
          : [];

    if (rawList.length === 0) {
      return NextResponse.json({ error: 'Izaberite bar jedan datum.' }, { status: 400 });
    }

    if (rawList.length > MAX_BOOKING_DATES) {
      return NextResponse.json(
        { error: `Možete izabrati najviše ${MAX_BOOKING_DATES} dana u jednom upitu.` },
        { status: 400 }
      );
    }

    const messageStr = message != null ? String(message) : '';
    if (messageStr.length > BOOKING_MESSAGE_MAX) {
      return NextResponse.json(
        { error: `Poruka je predugačka (maks. ${BOOKING_MESSAGE_MAX} karaktera).` },
        { status: 400 }
      );
    }
    const messageStored = messageStr.trim() || null;

    const keySet = new Set();
    for (const d of rawList) {
      const k = String(d).split('T')[0].trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) {
        return NextResponse.json({ error: `Neispravan format datuma: ${d}` }, { status: 400 });
      }
      keySet.add(k);
    }
    const uniqueKeys = [...keySet].sort();

    if (uniqueKeys.length > MAX_BOOKING_DATES) {
      return NextResponse.json(
        { error: `Možete izabrati najviše ${MAX_BOOKING_DATES} različitih dana u jednom upitu.` },
        { status: 400 }
      );
    }

    const parsedSlots = [];
    for (const key of uniqueKeys) {
      const dp = parseCalendarDateParam(key);
      if (!dp) {
        return NextResponse.json({ error: `Neispravan datum: ${key}` }, { status: 400 });
      }
      parsedSlots.push(dp);
    }
    parsedSlots.sort((a, b) => a.getTime() - b.getTime());

    if (isDemoBandId(bandId)) {
      return NextResponse.json(
        {
          error:
            'Ovo je demo profil za prezentaciju. Kada se bend registruje na platformi, ovde će raditi prava rezervacija.',
        },
        { status: 400 }
      );
    }

    for (const dp of parsedSlots) {
      const dayEnd = new Date(dp.getTime() + 86400000);
      const busyDate = await prisma.busyDate.findFirst({
        where: {
          bandId,
          date: { gte: dp, lt: dayEnd },
        },
      });
      if (busyDate) {
        return NextResponse.json(
          { error: 'Bend je zauzet na jedan od izabranih datuma (kalendar).' },
          { status: 409 }
        );
      }
      const confirmed = await prisma.booking.findFirst({
        where: {
          bandId,
          status: 'CONFIRMED',
          date: { gte: dp, lt: dayEnd },
        },
      });
      if (confirmed) {
        return NextResponse.json(
          { error: 'Jedan od datuma je već potvrđen za drugu rezervaciju.' },
          { status: 409 }
        );
      }
    }

    const bookings = await prisma.$transaction(
      parsedSlots.map((dp) =>
        prisma.booking.create({
          data: {
            bandId,
            clientName,
            clientEmail,
            clientPhone,
            date: dp,
            message: messageStored,
            location,
            status: 'PENDING',
          },
        })
      )
    );

    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: { name: true, user: { select: { email: true } } },
    });

    try {
      await sendBookingNotificationToBand({
        bandEmail: band?.user?.email,
        bandName: band?.name || 'Bend',
        bookings,
      });
    } catch (mailErr) {
      console.error('[booking-email] Slanje mejla nije uspelo:', mailErr);
    }

    return NextResponse.json({
      success: true,
      bookings,
      count: bookings.length,
      booking: bookings[0],
    });
  } catch (error) {
    console.error('Booking Error:', error);
    return NextResponse.json({ error: 'Greška pri slanju upita.' }, { status: 500 });
  }
}

export async function GET(request) {
  const authUser = await getAuthUserFromRequest(request);
  if (!authUser?.userId) {
    return NextResponse.json({ error: 'Neautorizovano.' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: { bandId: true },
  });

  const bandId = user?.bandId;
  if (!bandId) {
    return NextResponse.json(
      { error: 'Samo član benda sa povezanim profilom može da vidi upite.' },
      { status: 403 }
    );
  }

  const requested = new URL(request.url).searchParams.get('bandId');
  if (requested && requested !== bandId) {
    return NextResponse.json({ error: 'Pristup odbijen.' }, { status: 403 });
  }

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
