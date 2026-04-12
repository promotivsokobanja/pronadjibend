import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getCurrentUser(request) {
  const authUser = await getAuthUserFromRequest(request);
  if (!authUser?.userId) return null;

  return prisma.user.findUnique({
    where: { id: authUser.userId },
    select: {
      id: true,
      role: true,
      bandId: true,
      musicianProfile: { select: { id: true } },
    },
  });
}

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    if (!currentUser.bandId) {
      return NextResponse.json(
        { error: 'Samo bend nalozi mogu slati pozive muzičarima.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const musicianId = String(body?.musicianId || '').trim();
    const message = String(body?.message || '').trim();
    const location = String(body?.location || '').trim();
    const eventDateRaw = String(body?.eventDate || '').trim();
    const feeRaw = body?.feeEur;
    const feeEur = feeRaw === '' || feeRaw == null ? null : Number(feeRaw);

    if (!musicianId) {
      return NextResponse.json({ error: 'ID muzičara je obavezan.' }, { status: 400 });
    }

    if (!eventDateRaw || !location || !message || feeEur == null) {
      return NextResponse.json(
        { error: 'Za slanje poziva obavezni su datum, lokacija, honorar i poruka.' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(feeEur) || feeEur <= 0) {
      return NextResponse.json({ error: 'Honorаr mora biti pozitivan broj.' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Poruka je predugačka.' }, { status: 400 });
    }

    const musician = await prisma.musicianProfile.findUnique({
      where: { id: musicianId },
      select: { id: true, userId: true, name: true, primaryInstrument: true, city: true },
    });

    if (!musician) {
      return NextResponse.json({ error: 'Muzičar nije pronađen.' }, { status: 404 });
    }

    if (musician.userId && musician.userId === currentUser.id) {
      return NextResponse.json({ error: 'Ne možete poslati poziv sopstvenom profilu.' }, { status: 400 });
    }

    const band = await prisma.band.findUnique({
      where: { id: currentUser.bandId },
      select: { id: true, name: true, location: true },
    });

    if (!band || !String(band.name || '').trim() || !String(band.location || '').trim()) {
      return NextResponse.json(
        { error: 'Bend profil mora imati popunjene osnovne podatke (naziv i lokacija).' },
        { status: 400 }
      );
    }

    if (
      !String(musician.name || '').trim()
      || !String(musician.primaryInstrument || '').trim()
      || !String(musician.city || '').trim()
    ) {
      return NextResponse.json(
        { error: 'Muzičar profil nema popunjena obavezna polja (ime, instrument, grad).' },
        { status: 400 }
      );
    }

    let eventDate = null;
    const parsed = new Date(`${eventDateRaw}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Datum nije validan.' }, { status: 400 });
    }
    eventDate = parsed;

    const normalizedFee = Number.isFinite(feeEur) ? Math.max(0, Math.floor(feeEur)) : null;

    const invite = await prisma.musicianInvite.create({
      data: {
        bandId: currentUser.bandId,
        musicianId,
        eventDate,
        location: location || null,
        feeEur: normalizedFee,
        message: message || null,
      },
      include: {
        band: { select: { id: true, name: true } },
        musician: { select: { id: true, name: true, primaryInstrument: true } },
      },
    });

    return NextResponse.json({ success: true, invite });
  } catch (error) {
    console.error('Musician invite POST error:', error);
    return NextResponse.json({ error: 'Greška pri slanju poziva.' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    if (currentUser.bandId) {
      const sent = await prisma.musicianInvite.findMany({
        where: { bandId: currentUser.bandId },
        include: {
          musician: { select: { id: true, name: true, primaryInstrument: true, city: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return NextResponse.json({ invites: sent, mode: 'sent' });
    }

    if (currentUser.musicianProfile?.id) {
      const received = await prisma.musicianInvite.findMany({
        where: { musicianId: currentUser.musicianProfile.id },
        include: {
          band: { select: { id: true, name: true, location: true, genre: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return NextResponse.json({ invites: received, mode: 'received' });
    }

    return NextResponse.json({ invites: [], mode: 'none' });
  } catch (error) {
    console.error('Musician invite GET error:', error);
    return NextResponse.json({ error: 'Greška pri učitavanju poziva.' }, { status: 500 });
  }
}
