import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sessionOwnerWhere } from '@/lib/programOwner';

export const dynamic = 'force-dynamic';

/** Uređaji prijavljeni iz programa / tableta. */
export async function GET(request) {
  const { where, error } = await sessionOwnerWhere(request);
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
  const { where, error } = await sessionOwnerWhere(request);
  if (error) return error;
  const id = new URL(request.url).searchParams.get('id') || '';
  const n = await prisma.programDevice.deleteMany({ where: { ...where, id } });
  return NextResponse.json({ ok: n.count > 0 });
}
