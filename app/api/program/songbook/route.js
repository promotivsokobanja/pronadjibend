import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { ownerFromProgramKey } from '../../../../lib/programKey';
import { cleanSongbook } from '../../../../lib/korgImport';

export const dynamic = 'force-dynamic';

/**
 * POST /api/program/songbook  (zaglavlje X-Program-Key)
 * { entries: [{ broj, ime, tempo, takt, grupa }], lists: [{ ime, pesme: [ime na Korgu] }] }
 * Ceo Korg SongBook iz programa – čuva se za pregled na strani „Uvoz sa Korga“ (prethodni neuvezeni se zameni).
 * Ništa se ne upisuje u repertoar dok muzičar ne potvrdi.
 */
export async function POST(request) {
  const owner = await ownerFromProgramKey(request);
  if (!owner) return NextResponse.json({ error: 'Pogrešan ili isključen ključ za program.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const { entries, lists } = cleanSongbook(body);
  if (!entries.length) return NextResponse.json({ error: 'SongBook je prazan.' }, { status: 400 });
  await prisma.korgImport.deleteMany({ where: owner.filter });
  const imp = await prisma.korgImport.create({ data: { ...owner.filter, entries, lists } });
  return NextResponse.json({
    id: imp.id, entries: entries.length, lists: lists.length,
    withNumber: entries.filter((e) => e.broj).length, url: '/bands/korg-uvoz',
  });
}
