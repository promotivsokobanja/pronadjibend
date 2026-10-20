import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cleanLyrics } from '@/lib/cleanLyrics';
import { normTitle, ownerFromProgramKey } from '@/lib/programKey';

export const dynamic = 'force-dynamic';

/**
 * API za program MIDI Konverter Pa5X (računar / tablet), ključ u zaglavlju X-Program-Key:
 *   GET   – aktivne porudžbine (na čekanju / prihvaćene) sa Korg brojem i tekstom pesme; ?pesme=1 – repertoar
 *   PATCH – { id, status } – prihvati / odsvirano / odbij
 *   POST  – { numbers: [{ broj, pesma, izvodjac, sajt_id }] } – Korg brojevi iz SongBook-a za pesme repertoara
 */
async function auth(request) {
  const owner = await ownerFromProgramKey(request);
  if (!owner) return { error: NextResponse.json({ error: 'Pogrešan ili isključen ključ za program.' }, { status: 401 }) };
  return { owner };
}

export async function GET(request) {
  const { owner, error } = await auth(request);
  if (error) return error;
  if (new URL(request.url).searchParams.get('pesme')) {  // repertoar – program po njemu povezuje SongBook
    const songs = await prisma.song.findMany({
      where: owner.filter, select: { id: true, title: true, artist: true, korgNumber: true }, orderBy: { title: 'asc' },
    });
    return NextResponse.json({ owner: { type: owner.type, name: owner.name }, songs });
  }
  const reqs = await prisma.liveRequest.findMany({
    where: { ...owner.filter, status: { in: ['PENDING', 'ACCEPTED'] } },
    include: { song: { select: { id: true, title: true, artist: true, korgNumber: true, key: true, lyrics: true } } },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
  return NextResponse.json({
    owner: { type: owner.type, name: owner.name },
    requests: reqs.map((r) => ({
      id: r.id,
      status: r.status.toLowerCase(),
      type: (r.requestType || 'SONG').toLowerCase(),
      table: r.tableNum,
      createdAt: r.createdAt,
      note: r.guestNote ? r.guestNote.replace(/^STRELO:\s*/i, '').trim() : null,
      tipRsd: r.tipAmountRsd || null,
      song: r.song
        ? { id: r.song.id, title: r.song.title, artist: r.song.artist, korgNumber: r.song.korgNumber, key: r.song.key,
            lyrics: cleanLyrics(r.song.lyrics || '') || '' }
        : null,
    })),
  });
}

export async function PATCH(request) {
  const { owner, error } = await auth(request);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const status = String(body?.status || '').toUpperCase();
  if (!body?.id || !['PENDING', 'ACCEPTED', 'PLAYED', 'REJECTED'].includes(status)) {
    return NextResponse.json({ error: 'id i status su obavezni.' }, { status: 400 });
  }
  const found = await prisma.liveRequest.findFirst({ where: { id: String(body.id), ...owner.filter }, select: { id: true } });
  if (!found) return NextResponse.json({ error: 'Porudžbina nije pronađena.' }, { status: 404 });
  const upd = await prisma.liveRequest.update({ where: { id: found.id }, data: { status } });
  return NextResponse.json({ id: upd.id, status: upd.status.toLowerCase() });
}

export async function POST(request) {
  const { owner, error } = await auth(request);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const numbers = Array.isArray(body?.numbers) ? body.numbers.slice(0, 5000) : [];
  const songs = await prisma.song.findMany({ where: owner.filter, select: { id: true, title: true, artist: true, korgNumber: true } });
  const byId = new Map(songs.map((s) => [s.id, s]));
  const byTitle = new Map();
  for (const s of songs) {
    const k = normTitle(s.title);
    if (!byTitle.has(k)) byTitle.set(k, []);
    byTitle.get(k).push(s);
  }
  const updates = new Map();
  const unmatched = [];
  for (const n of numbers) {
    const broj = Number(n?.broj);
    if (!Number.isInteger(broj) || broj < 1 || broj > 9999) continue;
    let song = n?.sajt_id ? byId.get(String(n.sajt_id)) : null;
    if (!song) {
      const cands = byTitle.get(normTitle(n?.pesma)) || [];
      song = cands.length === 1 ? cands[0]
        : cands.find((s) => normTitle(s.artist) === normTitle(n?.izvodjac)) || null;
    }
    if (song) updates.set(song.id, broj);
    else if (n?.pesma) unmatched.push(String(n.pesma));
  }
  let changed = 0;
  for (const [id, broj] of updates) {
    if (byId.get(id)?.korgNumber === broj) continue;
    await prisma.song.update({ where: { id }, data: { korgNumber: broj } });
    changed++;
  }
  return NextResponse.json({ matched: updates.size, changed, unmatched: unmatched.slice(0, 200), total: songs.length });
}
