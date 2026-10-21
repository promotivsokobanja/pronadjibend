import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { resolveSongOwner } from '../../../../lib/songOwner';
import { normTitle } from '../../../../lib/programKey';
import {
  KORG_LIST_PREFIX, KORG_OTHER_CATEGORY, namesInLists, keyFromKorgName, korgWords, pickBest, ownerWhere, ownerData,
} from '../../../../lib/korgImport';

export const dynamic = 'force-dynamic';

/** Ime sa Korga kao naslov nove pesme: bez tonaliteta na kraju („Kad bi me ma-G/C“ → „Kad bi me ma“). */
function titleFromKorg(name) {
  return String(name || '').replace(/[\s\-_]+[A-H](#|b|is|es)?m?(\s*\/\s*[A-H](#|b)?m?)*\s*$/, '').trim() || name;
}

/**
 * POST /api/korg-import/apply – u delovima (stranica šalje po 40):
 *   { items: [{ i, akcija: "repertoar"|"pesmarica"|"novo"|"preskoci", songId }] }  → pesme u repertoar
 *   { lists: ["Begin", …] }  → set liste sa Korga kao „Korg · Begin“ (posle svih pesama; liste sajta se ne diraju)
 * Pesma koja je već u repertoaru se ne duplira – dobija Korg broj i tonalitet sa Korga.
 * Nova pesma iz neke Korg set liste dobija svoju kategoriju (iz pesmarice); ostale pesme sa Korga idu u posebnu
 * grupu „Korg – ostale“ (neuređene).
 */
export async function POST(request) {
  const { owner, error } = await resolveSongOwner(request, {});
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const imp = await prisma.korgImport.findFirst({ where: ownerWhere(owner), orderBy: { createdAt: 'desc' } });
  if (!imp) return NextResponse.json({ error: 'Nema poslatog SongBook-a.' }, { status: 404 });
  const entries = Array.isArray(imp.entries) ? imp.entries : [];
  const where = ownerWhere(owner);

  if (Array.isArray(body?.lists)) return applyLists(owner, where, imp, entries, body.lists);

  const items = (Array.isArray(body?.items) ? body.items : []).slice(0, 60);
  const mine = await prisma.song.findMany({ where, select: { id: true, title: true, artist: true, korgNumber: true } });
  const byTitle = new Map(mine.map((s) => [`${normTitle(s.title)}|${normTitle(s.artist)}`, s]));
  const inLists = namesInLists(imp.lists);
  const out = { novih: 0, azurirano: 0, preskoceno: 0 };

  const setKorg = async (songId, e) => {
    const data = {};
    if (e.broj) {
      // Korg broj pripada samo jednoj pesmi – ranija pesma sa tim brojem ga gubi (Korg je merodavan)
      await prisma.song.updateMany({ where: { ...where, korgNumber: e.broj, NOT: { id: songId } }, data: { korgNumber: null } });
      data.korgNumber = e.broj;
    }
    const key = keyFromKorgName(e.ime);
    if (key) data.key = key;
    if (Object.keys(data).length) await prisma.song.update({ where: { id: songId }, data });
  };

  for (const it of items) {
    const e = entries[Number(it?.i)];
    if (!e || it?.akcija === 'preskoci') { out.preskoceno += 1; continue; }
    if (it.akcija === 'repertoar') {
      const s = mine.find((x) => x.id === it.songId);
      if (!s) { out.preskoceno += 1; continue; }
      await setKorg(s.id, e);
      out.azurirano += 1;
      continue;
    }
    let data;
    if (it.akcija === 'pesmarica') {
      const g = await prisma.song.findFirst({
        where: { id: String(it.songId || ''), bandId: null, musicianProfileId: null },
        select: { title: true, artist: true, lyrics: true, chords: true, category: true, type: true },
      });
      if (!g) { out.preskoceno += 1; continue; }
      data = { title: g.title, artist: g.artist || 'Nepoznat', lyrics: g.lyrics, chords: g.chords,
        category: inLists.has(e.ime) ? (g.category || 'Razno') : KORG_OTHER_CATEGORY, type: g.type || 'Zabavna' };
    } else if (it.akcija === 'novo') {
      data = { title: titleFromKorg(e.ime), artist: 'Nepoznat', category: inLists.has(e.ime) ? 'Razno' : KORG_OTHER_CATEGORY,
        type: 'Zabavna' };
    } else { out.preskoceno += 1; continue; }
    const dupKey = `${normTitle(data.title)}|${normTitle(data.artist)}`;
    const dup = byTitle.get(dupKey);
    if (dup) {                                       // već postoji – ne duplira se, Korg podaci u postojeću
      await setKorg(dup.id, e);
      out.azurirano += 1;
      continue;
    }
    const created = await prisma.song.create({ data: { ...data, ...ownerData(owner) }, select: { id: true, title: true, artist: true } });
    byTitle.set(dupKey, { ...created, korgNumber: null });
    mine.push({ ...created, korgNumber: null });
    await setKorg(created.id, e);
    out.novih += 1;
  }
  return NextResponse.json(out);
}

async function applyLists(owner, where, imp, entries, wanted) {
  const want = new Set(wanted.map((n) => String(n)));
  const lists = (Array.isArray(imp.lists) ? imp.lists : []).filter((l) => want.has(l.ime));
  const mine = await prisma.song.findMany({ where, select: { id: true, title: true, artist: true, korgNumber: true } });
  const byNum = new Map(mine.filter((s) => s.korgNumber).map((s) => [s.korgNumber, s.id]));
  const byName = new Map(entries.map((e) => [e.ime, e]));
  const songFor = (name) => {
    const e = byName.get(name);
    if (e?.broj && byNum.has(e.broj)) return byNum.get(e.broj);
    const { best } = pickBest(korgWords(name), mine);   // pesma bez Korg broja (MIDI/MP3) – po naslovu
    return best ? best.id : null;
  };
  const existing = await prisma.setList.findMany({ where: { ...where, name: { startsWith: KORG_LIST_PREFIX } }, select: { id: true, name: true } });
  const done = [];
  for (const l of lists) {
    const name = (KORG_LIST_PREFIX + l.ime).slice(0, 80);
    const ids = [];
    for (const n of l.pesme || []) {
      const id = songFor(n);
      if (id && !ids.includes(id)) ids.push(id);
    }
    let sl = existing.find((x) => x.name === name);
    if (!sl && !ids.length) { done.push({ ime: name, pesama: 0, od: (l.pesme || []).length }); continue; } // prazna – ne pravi se
    if (sl) await prisma.setListItem.deleteMany({ where: { setListId: sl.id } });   // samo „Korg ·“ liste
    else sl = await prisma.setList.create({ data: { name, ...ownerData(owner) }, select: { id: true, name: true } });
    if (ids.length) {
      await prisma.setListItem.createMany({ data: ids.map((songId, position) => ({ setListId: sl.id, songId, position })) });
    }
    done.push({ ime: name, pesama: ids.length, od: (l.pesme || []).length });
  }
  await prisma.korgImport.deleteMany({ where });  // uvoz završen – sledeći put se šalje novi SongBook
  return NextResponse.json({ liste: done });
}
