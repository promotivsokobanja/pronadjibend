import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

function normalizeMaxPendingRequests(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.floor(parsed);
  if (normalized < 0 || normalized > 50) return null;
  return normalized;
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

    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true, role: true, bandId: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const canEdit = currentUser.role === 'ADMIN' || currentUser.bandId === id;
    if (!canEdit) {
      return NextResponse.json({ error: 'Nemate dozvolu za izmenu ovih podešavanja.' }, { status: 403 });
    }

    const body = await request.json();
    const maxPendingRequests = normalizeMaxPendingRequests(body?.maxPendingRequests);

    if (maxPendingRequests === null) {
      return NextResponse.json(
        { error: 'maxPendingRequests mora biti ceo broj između 0 i 50.' },
        { status: 400 }
      );
    }

    const existingBand = await prisma.band.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingBand) {
      return NextResponse.json({ error: 'Bend nije pronađen' }, { status: 404 });
    }

    const updatedBand = await prisma.band.update({
      where: { id },
      data: { maxPendingRequests },
      select: { id: true, maxPendingRequests: true },
    });

    return NextResponse.json(updatedBand);
  } catch (error) {
    console.error('Band live settings PATCH error:', error);
    return NextResponse.json({ error: 'Greška pri čuvanju live podešavanja' }, { status: 500 });
  }
}
