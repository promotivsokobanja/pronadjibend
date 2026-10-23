import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sessionOwnerWhere } from '@/lib/programOwner';

export const dynamic = 'force-dynamic';

/**
 * „Pozovi na Korgu“ iz Live panela: { songId } → komanda za program / tablet (preuzmu je anketom za par sekundi i
 * pripreme pesmu na Korgu po SongBook broju, bez Starta). Samo vlasnik benda (prijavljen na sajt).
 */
export async function POST(request) {
  const { where, error } = await sessionOwnerWhere(request);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const songId = String(body?.songId || '');
  if (!songId) return NextResponse.json({ error: 'Nedostaje pesma.' }, { status: 400 });
  const song = await prisma.song.findFirst({ where: { id: songId, ...where }, select: { id: true, title: true, korgNumber: true } });
  if (!song) return NextResponse.json({ error: 'Pesma nije u vašem repertoaru.' }, { status: 404 });
  if (!song.korgNumber) {
    return NextResponse.json({ error: 'Pesma nema Korg broj – pošalji brojeve iz programa (📖 SongBook › ⬆ Pošalji brojeve na sajt).' },
      { status: 409 });
  }
  try {
    await prisma.programCommand.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } });
    await prisma.programCommand.create({ data: { ...where, songId: song.id, korgNumber: song.korgNumber, title: song.title } });
  } catch (e) {
    console.error('Program command error:', e);
    return NextResponse.json({ error: 'Komanda nije poslata (baza).' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, korgNumber: song.korgNumber, title: song.title });
}
