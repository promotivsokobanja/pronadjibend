import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../../lib/auth';
import { sendBookingConfirmedEmails } from '../../../../lib/sendBookingNotificationEmail';

export const dynamic = 'force-dynamic';

async function assertBandBookingAccess(request, id) {
  const authUser = await getAuthUserFromRequest(request);
  if (!authUser?.userId) {
    return { error: NextResponse.json({ error: 'Neautorizovano.' }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: { bandId: true },
  });

  if (!user?.bandId) {
    return {
      error: NextResponse.json(
        { error: 'Samo član benda sa povezanim profilom može da upravlja upitima.' },
        { status: 403 }
      ),
    };
  }

  const existing = await prisma.booking.findUnique({
    where: { id },
    select: { bandId: true, status: true },
  });

  if (!existing) {
    return { error: NextResponse.json({ error: 'Rezervacija nije pronađena.' }, { status: 404 }) };
  }

  if (existing.bandId !== user.bandId) {
    return { error: NextResponse.json({ error: 'Pristup odbijen.' }, { status: 403 }) };
  }

  return { user, existing };
}

/**
 * action: "accept"  — PENDING → BAND_ACCEPTED
 * action: "confirm" — BAND_ACCEPTED → CONFIRMED (bend sam potvrđuje)
 * action: "complete" — CONFIRMED → COMPLETED (završen nastup)
 * action: "reject"  — PENDING | BAND_ACCEPTED | CONFIRMED → CANCELLED
 */
export async function PATCH(request, { params } = {}) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: 'Nedostaje id rezervacije.' }, { status: 400 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const action = typeof body?.action === 'string' ? body.action.trim().toLowerCase() : '';

  const gate = await assertBandBookingAccess(request, id);
  if (gate.error) return gate.error;
  const { existing } = gate;

  try {
    if (action === 'accept') {
      if (existing.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Prihvat je moguć samo za nove upite (PENDING).' },
          { status: 400 }
        );
      }
      const booking = await prisma.booking.update({
        where: { id },
        data: { status: 'BAND_ACCEPTED' },
      });
      return NextResponse.json({ success: true, booking });
    }

    if (action === 'confirm') {
      if (existing.status !== 'BAND_ACCEPTED') {
        return NextResponse.json(
          { error: 'Potvrda je moguća samo za prihvaćene upite (BAND_ACCEPTED).' },
          { status: 400 }
        );
      }
      const booking = await prisma.booking.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        select: {
          id: true, status: true, clientName: true, clientEmail: true,
          clientPhone: true, date: true, message: true, location: true,
          band: { select: { name: true, user: { select: { email: true } } } },
        },
      });
      try {
        await sendBookingConfirmedEmails({
          bandEmail: booking.band?.user?.email,
          bandName: booking.band?.name,
          booking,
        });
      } catch (mailErr) {
        console.error('[booking-email] Potvrda (CONFIRMED):', mailErr);
      }
      return NextResponse.json({ success: true, booking });
    }

    if (action === 'complete') {
      if (existing.status !== 'CONFIRMED') {
        return NextResponse.json(
          { error: 'Označavanje završetka moguće je samo za potvrđene rezervacije.' },
          { status: 400 }
        );
      }
      const booking = await prisma.booking.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });
      return NextResponse.json({ success: true, booking });
    }

    if (action === 'reject') {
      if (!['PENDING', 'BAND_ACCEPTED', 'CONFIRMED'].includes(existing.status)) {
        return NextResponse.json(
          { error: 'Odbijanje nije moguće u ovom statusu.' },
          { status: 400 }
        );
      }
      const booking = await prisma.booking.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.json({ success: true, booking });
    }

    return NextResponse.json(
      { error: 'Nepoznata akcija. Koristite accept, confirm, complete ili reject.' },
      { status: 400 }
    );
  } catch (error) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Rezervacija nije pronađena.' }, { status: 404 });
    }
    console.error('bookings/[id] PATCH', error);
    return NextResponse.json({ error: 'Greška pri ažuriranju.' }, { status: 500 });
  }
}

export async function DELETE(request, { params } = {}) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: 'Nedostaje id rezervacije.' }, { status: 400 });
  }

  const gate = await assertBandBookingAccess(request, id);
  if (gate.error) return gate.error;

  try {
    await prisma.booking.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Rezervacija nije pronađena.' }, { status: 404 });
    }
    console.error('bookings/[id] DELETE', error);
    return NextResponse.json({ error: 'Greška pri brisanju.' }, { status: 500 });
  }
}
