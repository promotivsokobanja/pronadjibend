import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Bend ili muzičar prijavljenog korisnika (ili onaj iz ?bandId / ?musicianId, ako je njegov) – kao /api/program/key. */
async function ownerWhere(request) {
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

/** Uređaji prijavljeni iz programa / tableta. */
export async function GET(request) {
  const { where, error } = await ownerWhere(request);
  if (error) return error;
  try {
    const devices = await prisma.programDevice.findMany({
      where, orderBy: { createdAt: 'desc' }, select: { id: true, label: true, createdAt: true, lastUsedAt: true },
    });
    return NextResponse.json({ devices });
  } catch {
    return NextResponse.json({ devices: [] });        // tabela još nije napravljena
  }
}

/** Odjavi uređaj (?id=…) – njegov ključ odmah prestaje da važi. */
export async function DELETE(request) {
  const { where, error } = await ownerWhere(request);
  if (error) return error;
  const id = new URL(request.url).searchParams.get('id') || '';
  const n = await prisma.programDevice.deleteMany({ where: { ...where, id } });
  return NextResponse.json({ ok: n.count > 0 });
}
