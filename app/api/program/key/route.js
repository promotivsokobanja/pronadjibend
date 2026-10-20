import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';
import { hashProgramKey, newProgramKey } from '@/lib/programKey';

export const dynamic = 'force-dynamic';

/** Bend ili muzičar prijavljenog korisnika (ili onaj iz ?bandId / ?musicianId, ako je njegov). */
async function ownerOf(request) {
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
  if (bandId && (isAdmin || user?.bandId === bandId)) return { owner: { type: 'band', id: bandId } };
  if (musicianId && (isAdmin || user?.musicianProfile?.id === musicianId)) return { owner: { type: 'musician', id: musicianId } };
  if (!bandId && !musicianId) {
    if (user?.bandId) return { owner: { type: 'band', id: user.bandId } };
    if (user?.musicianProfile?.id) return { owner: { type: 'musician', id: user.musicianProfile.id } };
  }
  return { error: NextResponse.json({ error: 'Nemate dozvolu.' }, { status: 403 }) };
}

function table(owner) {
  return owner.type === 'band' ? prisma.band : prisma.musicianProfile;
}

export async function GET(request) {
  const { owner, error } = await ownerOf(request);
  if (error) return error;
  const row = await table(owner).findUnique({ where: { id: owner.id }, select: { programKeyHash: true } });
  return NextResponse.json({ hasKey: !!row?.programKeyHash });
}

/** Novi ključ (stari prestaje da važi). Ključ se prikazuje samo sada. */
export async function POST(request) {
  const { owner, error } = await ownerOf(request);
  if (error) return error;
  const key = newProgramKey();
  await table(owner).update({ where: { id: owner.id }, data: { programKeyHash: hashProgramKey(key) } });
  return NextResponse.json({ key });
}

/** Isključi program (ključ prestaje da važi). */
export async function DELETE(request) {
  const { owner, error } = await ownerOf(request);
  if (error) return error;
  await table(owner).update({ where: { id: owner.id }, data: { programKeyHash: null } });
  return NextResponse.json({ ok: true });
}
