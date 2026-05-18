import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

export async function GET(request, { params }) {
  const id = params?.id;

  if (!id || id === '[id]') {
    return NextResponse.json({ error: 'ID je obavezan' }, { status: 400 });
  }

  try {
    let profile = await prisma.musicianProfile.findUnique({
      where: { id },
      select: { id: true, allowTips: true, allowFullRepertoireLive: true },
    });
    if (!profile) {
      profile = await prisma.musicianProfile.findUnique({
        where: { userId: id },
        select: { id: true, allowTips: true, allowFullRepertoireLive: true },
      });
    }
    if (!profile) {
      return NextResponse.json({ error: 'Muzičar nije pronađen' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Musician live settings GET error:', error);
    return NextResponse.json({ error: 'Greška pri učitavanju live podešavanja' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const id = params?.id;

  if (!id || id === '[id]') {
    return NextResponse.json({ error: 'ID je obavezan' }, { status: 400 });
  }

  try {
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser?.userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // Find the musician profile
    let profile = await prisma.musicianProfile.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!profile) {
      profile = await prisma.musicianProfile.findUnique({
        where: { userId: id },
        select: { id: true, userId: true },
      });
    }
    if (!profile) {
      return NextResponse.json({ error: 'Muzičar nije pronađen' }, { status: 404 });
    }

    // Authorization: user must be the profile owner or admin
    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true, role: true },
    });
    const canEdit = currentUser?.role === 'ADMIN' || profile.userId === authUser.userId;
    if (!canEdit) {
      return NextResponse.json({ error: 'Nemate dozvolu za izmenu ovih podešavanja.' }, { status: 403 });
    }

    const body = await request.json();
    const data = {};

    if (body?.allowTips !== undefined) {
      data.allowTips = Boolean(body.allowTips);
    }

    if (body?.allowFullRepertoireLive !== undefined) {
      data.allowFullRepertoireLive = Boolean(body.allowFullRepertoireLive);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'Nema ispravnih live podešavanja za čuvanje.' },
        { status: 400 }
      );
    }

    const updated = await prisma.musicianProfile.update({
      where: { id: profile.id },
      data,
      select: { id: true, allowTips: true, allowFullRepertoireLive: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Musician live settings PATCH error:', error);
    return NextResponse.json({ error: 'Greška pri čuvanju live podešavanja' }, { status: 500 });
  }
}
