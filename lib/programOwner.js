import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

/**
 * Bend ili muzičar PRIJAVLJENOG korisnika sajta (ili onaj iz ?bandId / ?musicianId, ako je njegov / admin) →
 * { where: { bandId } | { musicianProfileId } } ili { error: odgovor }. Isto kao /api/program/key.
 */
export async function sessionOwnerWhere(request) {
  const auth = await getAuthUserFromRequest(request);
  if (!auth?.userId) return { error: NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 }) };
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true, bandId: true, musicianProfile: { select: { id: true } } },
  });
  const { searchParams } = new URL(request.url);
  const bandId = searchParams.get('bandId');
  const musicianId = searchParams.get('musicianId');
  const isAdmin = user?.role === 'ADMIN';
  if (bandId && (isAdmin || user?.bandId === bandId)) return { where: { bandId } };
  if (musicianId && (isAdmin || user?.musicianProfile?.id === musicianId)) return { where: { musicianProfileId: musicianId } };
  if (!bandId && !musicianId) {
    if (user?.bandId) return { where: { bandId: user.bandId } };
    if (user?.musicianProfile?.id) return { where: { musicianProfileId: user.musicianProfile.id } };
  }
  return { error: NextResponse.json({ error: 'Nemate dozvolu.' }, { status: 403 }) };
}
