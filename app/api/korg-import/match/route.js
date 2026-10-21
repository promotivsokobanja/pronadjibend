import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { resolveSongOwner } from '../../../../lib/songOwner';
import { korgWords, pickBest, pesmaricaCandidates, ownerWhere, keyFromKorgName } from '../../../../lib/korgImport';

export const dynamic = 'force-dynamic';

/**
 * POST /api/korg-import/match  { offset, limit }
 * Za deo poslatog SongBook-a nađe pesmu: prvo u repertoaru (ista pesma se ne duplira – Korg podaci se upišu u
 * nju), pa u pesmarici. status: "repertoar" | "sigurno" | "izaberi" | "nema".
 */
export async function POST(request) {
  const { owner, error } = await resolveSongOwner(request, {});
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const imp = await prisma.korgImport.findFirst({ where: ownerWhere(owner), orderBy: { createdAt: 'desc' } });
  if (!imp) return NextResponse.json({ error: 'Nema poslatog SongBook-a.' }, { status: 404 });
  const entries = Array.isArray(imp.entries) ? imp.entries : [];
  const offset = Math.max(0, Number(body?.offset) || 0);
  const limit = Math.min(60, Math.max(1, Number(body?.limit) || 40));
  const slice = entries.slice(offset, offset + limit);

  const mine = await prisma.song.findMany({
    where: ownerWhere(owner),
    select: { id: true, title: true, artist: true, korgNumber: true, lyrics: true },
  });
  const mineC = mine.map((s) => ({ id: s.id, title: s.title, artist: s.artist, korgNumber: s.korgNumber,
    hasLyrics: Boolean(s.lyrics && s.lyrics.length > 20) }));

  const one = async (e, k) => {
    const i = offset + k;
    const words = korgWords(e.ime);
    const key = keyFromKorgName(e.ime);
    // 1) već u repertoaru: isti Korg broj, ili isti naslov
    const byNum = e.broj ? mineC.find((s) => s.korgNumber === e.broj) : null;
    const rep = pickBest(words, mineC);
    const repSong = (byNum && pickBest(words, [byNum]).best) || rep.best;
    if (repSong) return { i, status: 'repertoar', key, song: repSong, candidates: [] };
    // 2) pesmarica
    const found = await pesmaricaCandidates(words);
    const { best, candidates } = pickBest(words, found);
    const strip = (c) => ({ id: c.id, title: c.title, artist: c.artist, hasLyrics: c.hasLyrics, score: c.score });
    if (best) return { i, status: 'sigurno', key, song: strip(best), candidates: candidates.map(strip) };
    if (candidates.length) return { i, status: 'izaberi', key, song: null, candidates: candidates.map(strip) };
    return { i, status: 'nema', key, song: null, candidates: [] };
  };

  const results = [];
  for (let j = 0; j < slice.length; j += 6) {
    const part = slice.slice(j, j + 6);
    results.push(...await Promise.all(part.map((e, k) => one(e, j + k))));
  }
  return NextResponse.json({ offset, results, total: entries.length });
}
