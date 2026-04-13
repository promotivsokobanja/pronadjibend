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

    const isBandAccount = !!currentUser.bandId;
    const isMusicianAccount = !!currentUser.musicianProfile?.id;

    if (!isBandAccount && !isMusicianAccount) {
      return NextResponse.json(
        { error: 'Morate imati bend ili muzičar profil da biste slali pozive.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const targetMusicianId = String(body?.musicianId || '').trim();
    const targetBandId = String(body?.bandId || '').trim();
    const message = String(body?.message || '').trim();
    const location = String(body?.location || '').trim();
    const eventDateRaw = String(body?.eventDate || '').trim();
    const feeRaw = body?.feeEur;
    const feeEur = feeRaw === '' || feeRaw == null ? null : Number(feeRaw);

    if (!targetMusicianId && !targetBandId) {
      return NextResponse.json({ error: 'ID muzičara ili benda je obavezan.' }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: 'Poruka je obavezna.' }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: 'Poruka je predugačka.' }, { status: 400 });
    }

    let eventDate = null;
    if (eventDateRaw) {
      const parsed = new Date(`${eventDateRaw}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Datum nije validan.' }, { status: 400 });
      }
      eventDate = parsed;
    }

    const normalizedFee = Number.isFinite(feeEur) && feeEur > 0 ? Math.floor(feeEur) : null;

    // --- BAND → MUSICIAN ---
    if (isBandAccount && targetMusicianId) {
      const musician = await prisma.musicianProfile.findUnique({
        where: { id: targetMusicianId },
        select: { id: true, userId: true, name: true, primaryInstrument: true, city: true },
      });
      if (!musician) {
        return NextResponse.json({ error: 'Muzičar nije pronađen.' }, { status: 404 });
      }
      if (musician.userId && musician.userId === currentUser.id) {
        return NextResponse.json({ error: 'Ne možete poslati poziv sopstvenom profilu.' }, { status: 400 });
      }
      if (!eventDateRaw || !location || feeEur == null) {
        return NextResponse.json(
          { error: 'Za slanje poziva obavezni su datum, lokacija i honorar.' },
          { status: 400 }
        );
      }

      const invite = await prisma.musicianInvite.create({
        data: {
          senderType: 'BAND',
          bandId: currentUser.bandId,
          musicianId: targetMusicianId,
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
    }

    // --- MUSICIAN → BAND ---
    if (isMusicianAccount && targetBandId) {
      const band = await prisma.band.findUnique({
        where: { id: targetBandId },
        select: { id: true, name: true, location: true, user: { select: { id: true } } },
      });
      if (!band) {
        return NextResponse.json({ error: 'Bend nije pronađen.' }, { status: 404 });
      }
      if (band.user?.id === currentUser.id) {
        return NextResponse.json({ error: 'Ne možete poslati poziv sopstvenom bendu.' }, { status: 400 });
      }

      const invite = await prisma.musicianInvite.create({
        data: {
          senderType: 'MUSICIAN',
          bandId: targetBandId,
          musicianId: currentUser.musicianProfile.id,
          senderMusicianId: currentUser.musicianProfile.id,
          eventDate,
          location: location || null,
          feeEur: normalizedFee,
          message: message || null,
        },
        include: {
          band: { select: { id: true, name: true } },
          musician: { select: { id: true, name: true, primaryInstrument: true } },
          senderMusician: { select: { id: true, name: true, primaryInstrument: true } },
        },
      });
      return NextResponse.json({ success: true, invite });
    }

    // --- MUSICIAN → MUSICIAN ---
    if (isMusicianAccount && targetMusicianId) {
      if (targetMusicianId === currentUser.musicianProfile.id) {
        return NextResponse.json({ error: 'Ne možete poslati poziv sebi.' }, { status: 400 });
      }
      const targetMusician = await prisma.musicianProfile.findUnique({
        where: { id: targetMusicianId },
        select: { id: true, name: true },
      });
      if (!targetMusician) {
        return NextResponse.json({ error: 'Muzičar nije pronađen.' }, { status: 404 });
      }

      const invite = await prisma.musicianInvite.create({
        data: {
          senderType: 'MUSICIAN',
          bandId: null,
          musicianId: targetMusicianId,
          senderMusicianId: currentUser.musicianProfile.id,
          eventDate,
          location: location || null,
          feeEur: normalizedFee,
          message: message || null,
        },
        include: {
          musician: { select: { id: true, name: true, primaryInstrument: true } },
          senderMusician: { select: { id: true, name: true, primaryInstrument: true } },
        },
      });
      return NextResponse.json({ success: true, invite });
    }

    return NextResponse.json({ error: 'Nevažeća kombinacija parametara.' }, { status: 400 });
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

    const myMusicianId = currentUser.musicianProfile?.id;
    const myBandId = currentUser.bandId;
    const conditions = [];

    if (myBandId) {
      conditions.push({ bandId: myBandId });
    }
    if (myMusicianId) {
      conditions.push({ musicianId: myMusicianId });
      conditions.push({ senderMusicianId: myMusicianId });
    }

    if (conditions.length === 0) {
      return NextResponse.json({ invites: [], mode: 'none' });
    }

    const invites = await prisma.musicianInvite.findMany({
      where: { OR: conditions },
      include: {
        band: { select: { id: true, name: true, location: true, genre: true } },
        musician: { select: { id: true, name: true, primaryInstrument: true, city: true } },
        senderMusician: { select: { id: true, name: true, primaryInstrument: true, city: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ invites, mode: myBandId ? 'band' : 'musician' });
  } catch (error) {
    console.error('Musician invite GET error:', error);
    return NextResponse.json({ error: 'Greška pri učitavanju poziva.' }, { status: 500 });
  }
}
