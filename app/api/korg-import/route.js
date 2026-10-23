import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { ownerFromProgramKey } from '@/lib/programKey';
import { resolveSongOwner } from '../../../lib/songOwner';
import { ownerWhere, namesInLists, KORG_LIST_PREFIX, importOwner } from '../../../lib/korgImport';

export const dynamic = 'force-dynamic';

/** GET /api/korg-import – poslednji SongBook poslat iz programa (za stranu „Uvoz sa Korga“). */
export async function GET(request) {
  const { owner, error } = await importOwner(request, resolveSongOwner, ownerFromProgramKey);
  if (error) return error;
  const imp = await prisma.korgImport.findFirst({ where: ownerWhere(owner), orderBy: { createdAt: 'desc' } });
  if (!imp) return NextResponse.json({ import: null });
  const entries = Array.isArray(imp.entries) ? imp.entries : [];
  const lists = Array.isArray(imp.lists) ? imp.lists : [];
  const inLists = namesInLists(lists);
  // „Korg ·“ liste na sajtu kojih više nema na Korgu (obrisane ili preimenovane) – mogu da se uklone pri uvozu
  const onKorg = new Set(lists.map((l) => (KORG_LIST_PREFIX + l.ime).slice(0, 80)));
  const siteKorg = await prisma.setList.findMany({
    where: { ...ownerWhere(owner), name: { startsWith: KORG_LIST_PREFIX } }, select: { name: true },
  });
  return NextResponse.json({
    import: {
      id: imp.id,
      createdAt: imp.createdAt,
      total: entries.length,
      withNumber: entries.filter((e) => e.broj).length,
      entries: entries.map((e, i) => ({ i, broj: e.broj, ime: e.ime, tempo: e.tempo, grupa: e.grupa, uListi: inLists.has(e.ime) })),
      lists: lists.map((l) => ({ ime: l.ime, n: (l.pesme || []).length })),
      staleLists: siteKorg.map((x) => x.name).filter((n) => !onKorg.has(n)),
    },
  });
}

/** DELETE /api/korg-import – odbaci poslati SongBook (repertoar se ne menja). */
export async function DELETE(request) {
  const { owner, error } = await importOwner(request, resolveSongOwner, ownerFromProgramKey);
  if (error) return error;
  const r = await prisma.korgImport.deleteMany({ where: ownerWhere(owner) });
  return NextResponse.json({ deleted: r.count });
}
