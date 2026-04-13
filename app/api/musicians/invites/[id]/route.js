import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUS = new Set(['ACCEPTED', 'REJECTED', 'CANCELLED']);

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

export async function DELETE(request, { params } = {}) {
  const inviteId = params?.id;
  if (!inviteId) {
    return NextResponse.json({ error: 'ID poziva je obavezan.' }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const existing = await prisma.musicianInvite.findUnique({
      where: { id: inviteId },
      select: { id: true, bandId: true, musicianId: true, senderMusicianId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Poziv nije pronađen.' }, { status: 404 });
    }

    const isMusicianOwner = currentUser.musicianProfile?.id === existing.musicianId;
    const isSenderMusician = currentUser.musicianProfile?.id && currentUser.musicianProfile.id === existing.senderMusicianId;
    const isBandOwner = currentUser.bandId === existing.bandId;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isMusicianOwner && !isSenderMusician && !isBandOwner && !isAdmin) {
      return NextResponse.json({ error: 'Nemate dozvolu za brisanje ovog poziva.' }, { status: 403 });
    }

    await prisma.musicianInvite.delete({ where: { id: inviteId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Musician invite DELETE error:', error);
    return NextResponse.json({ error: 'Greška pri brisanju poziva.' }, { status: 500 });
  }
}

export async function PATCH(request, { params } = {}) {
  const inviteId = params?.id;
  if (!inviteId) {
    return NextResponse.json({ error: 'ID poziva je obavezan.' }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const nextStatus = String(body?.status || '').trim().toUpperCase();

    if (!ALLOWED_STATUS.has(nextStatus)) {
      return NextResponse.json({ error: 'Status nije dozvoljen.' }, { status: 400 });
    }

    const existing = await prisma.musicianInvite.findUnique({
      where: { id: inviteId },
      select: {
        id: true,
        status: true,
        bandId: true,
        musicianId: true,
        senderMusicianId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Poziv nije pronađen.' }, { status: 404 });
    }

    const isMusicianOwner = currentUser.musicianProfile?.id === existing.musicianId;
    const isSenderMusician = currentUser.musicianProfile?.id && currentUser.musicianProfile.id === existing.senderMusicianId;
    const isBandOwner = currentUser.bandId === existing.bandId;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isMusicianOwner && !isSenderMusician && !isBandOwner && !isAdmin) {
      return NextResponse.json({ error: 'Nemate dozvolu za izmenu ovog poziva.' }, { status: 403 });
    }

    if (isMusicianOwner && !isSenderMusician && !['ACCEPTED', 'REJECTED'].includes(nextStatus) && !isAdmin) {
      return NextResponse.json({ error: 'Muzičar može prihvatiti ili odbiti poziv.' }, { status: 403 });
    }

    if (isSenderMusician && nextStatus !== 'CANCELLED' && !isAdmin) {
      return NextResponse.json({ error: 'Pošiljalac može samo otkazati poziv.' }, { status: 403 });
    }

    if (isBandOwner && nextStatus !== 'CANCELLED' && !isAdmin) {
      return NextResponse.json({ error: 'Bend može samo otkazati poslati poziv.' }, { status: 403 });
    }

    if (existing.status !== 'PENDING' && !isAdmin) {
      return NextResponse.json({ error: 'Samo PENDING pozivi mogu menjati status.' }, { status: 400 });
    }

    const updated = await prisma.musicianInvite.update({
      where: { id: inviteId },
      data: { status: nextStatus },
      include: {
        band: { select: { id: true, name: true } },
        musician: { select: { id: true, name: true, primaryInstrument: true } },
      },
    });

    return NextResponse.json({ success: true, invite: updated });
  } catch (error) {
    console.error('Musician invite PATCH error:', error);
    return NextResponse.json({ error: 'Greška pri promeni statusa poziva.' }, { status: 500 });
  }
}
