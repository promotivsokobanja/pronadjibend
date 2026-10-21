/**
 * Uvoz Korg Pa5X SongBook-a (iz programa MIDI Konverter Pa5X) u repertoar.
 *
 * Ime pesme na Korgu je obično skraćen POČETAK naslova sa tonalitetom na kraju („Kafanska pev-Gm“ →
 * „Kafanska pevačica“), pa se pesma traži po početku naslova; poslednja reč sme biti odsečena. Pravila su ista kao
 * u programu (songbook.match) – radije ne poveže nego da poveže pogrešno; nesigurno bira muzičar.
 */
import prisma from './prisma';
import { normTitle } from './programKey';

export const KORG_LIST_PREFIX = 'Korg · ';
/** Kategorija za pesme sa Korga koje nisu ni u jednoj Korg set listi (neuređene) – posebna grupa u repertoaru. */
export const KORG_OTHER_CATEGORY = 'Korg – ostale';

/** Imena pesama koje su bar u jednoj Korg set listi. */
export function namesInLists(lists) {
  return new Set((Array.isArray(lists) ? lists : []).flatMap((l) => l.pesme || []));
}

const KEY_RE = /[\s\-_]+([A-H](?:#|b|is|es)?m?)(?:\s*\/\s*[A-H](?:#|b)?m?)*\s*$/;
const TAG_RE = /^(brma|mrc|[a-h](is|es)?(m|mol|dur|mdur)?\d?)$/;

/** Tonalitet iz imena na Korgu („Kafanska pev-Gm“ → „Gm“, „Jedna reka-C/Fm“ → „C“) ili null. */
export function keyFromKorgName(name) {
  const m = String(name || '').match(KEY_RE);
  return m ? m[1].replace(/is$/, '#').replace(/es$/, 'b') : null;
}

/** Reči imena na Korgu za poređenje: bez tonaliteta i oznaka na kraju („Brma“, „MRC“, „Am“, „Hdur“). */
export function korgWords(name) {
  const t = normTitle(String(name || '').replace(KEY_RE, '')).split(' ').filter(Boolean);
  while (t.length > 1 && TAG_RE.test(t[t.length - 1])) t.pop();
  return t;
}

/** Ocena 0–100 da je naslov ista pesma kao ime na Korgu (0 = nije). */
export function scoreTitle(korg, title) {
  const ta = Array.isArray(korg) ? korg : korgWords(korg);
  const tb = normTitle(title).split(' ').filter(Boolean);
  if (!ta.length || !tb.length) return 0;
  const a = ta.join(' ');
  const b = tb.join(' ');
  if (a === b) return 100;
  if (ta.length === 2 && tb.length === 2 && ta[0] === tb[1] && ta[1] === tb[0]) return 90; // „Dragane moj“
  if (ta.length >= 2 && tb.length >= ta.length) {
    for (let i = 0; i < ta.length - 1; i += 1) if (ta[i] !== tb[i]) return 0;
    const last = ta[ta.length - 1];
    const full = tb[ta.length - 1];
    if (full === last) return 92;
    if (full.startsWith(last) && last.length >= 2) return 92; // poslednja reč odsečena na Korgu
  }
  return 0;
}

/** Najbolji kandidati: { best, candidates } – best samo kad je jedna pesma jasno najbolja. */
export function pickBest(words, candidates) {
  const scored = candidates
    .map((c) => ({ ...c, score: scoreTitle(words, c.title) }))
    .filter((c) => c.score > 0)
    .sort((x, y) => y.score - x.score || Number(y.hasLyrics) - Number(x.hasLyrics));
  if (!scored.length) return { best: null, candidates: [] };
  const top = scored[0].score;
  const tops = scored.filter((c) => c.score === top);
  const titles = new Set(tops.map((c) => normTitle(c.title)));
  // ista pesma više puta u pesmarici (različiti izvođači / unosi) – ako je samo jedna sa tekstom, uzmi nju
  let best = null;
  if (titles.size === 1) {
    const withLyrics = tops.filter((c) => c.hasLyrics);
    const artists = new Set(tops.map((c) => normTitle(c.artist)));
    if (artists.size === 1) best = withLyrics[0] || tops[0];
    else if (withLyrics.length === 1) best = withLyrics[0];
  }
  return { best, candidates: scored.slice(0, 8) };
}

// velika i mala slova sa kvačicama posebno: ~* u bazi ne mora da zna da je „Č“ isto što i „č“
const LETTER = { c: '[cčćČĆ]', s: '[sšŠ]', z: '[zžŽ]', d: '(?:dj|đ|Đ|d)' };

/** Postgres regex za početak naslova (bez obzira na kvačice i znakove između reči). */
export function titlePrefixRegex(words) {
  const w = words.slice(0, 3).map((word) =>
    word.replace(/dj/g, '\u0001').split('').map((ch) => {
      if (ch === '\u0001') return '(?:dj|đ|Đ)';
      if (LETTER[ch]) return LETTER[ch];
      return /[a-z0-9]/.test(ch) ? ch : '';
    }).join(''));
  return '^\\W*' + w.join('[^a-z0-9čćšžđČĆŠŽĐ]+');
}

/** Kandidati iz pesmarice (pesme bez vlasnika) za ime na Korgu. */
export async function pesmaricaCandidates(words) {
  if (!words.length || words.join('').length < 3) return [];
  const rows = await prisma.$queryRawUnsafe(
    'SELECT id, title, artist, (lyrics IS NOT NULL AND length(lyrics) > 20) AS "hasLyrics", category, type '
    // kraći naslovi prvi – tačan naslov („Ivana“) ne sme da ispadne iza 40 dužih („Ivana se kroz …“)
    + 'FROM "Song" WHERE "bandId" IS NULL AND "musicianProfileId" IS NULL AND title ~* $1 ORDER BY length(title) LIMIT 40',
    titlePrefixRegex(words),
  );
  return rows.map((r) => ({ ...r, hasLyrics: Boolean(r.hasLyrics) }));
}

/** Vlasnik kao filter i podaci za Prisma upit. */
export function ownerWhere(owner) {
  return owner.type === 'band' ? { bandId: owner.id } : { musicianProfileId: owner.id };
}

export function ownerData(owner) {
  return owner.type === 'band'
    ? { bandId: owner.id, musicianProfileId: null }
    : { bandId: null, musicianProfileId: owner.id };
}

/** Očisti i ograniči ono što program pošalje. */
export function cleanSongbook(body) {
  const entries = (Array.isArray(body?.entries) ? body.entries : []).slice(0, 6000).map((e) => ({
    broj: Number.isInteger(Number(e?.broj)) && Number(e.broj) >= 1 && Number(e.broj) <= 9999 ? Number(e.broj) : null,
    ime: String(e?.ime || '').slice(0, 80).trim(),
    tempo: Number(e?.tempo) > 0 && Number(e.tempo) < 400 ? Math.round(Number(e.tempo)) : null,
    takt: String(e?.takt || '').slice(0, 8),
    grupa: String(e?.grupa || '').slice(0, 80),
  })).filter((e) => e.ime);
  const lists = (Array.isArray(body?.lists) ? body.lists : []).slice(0, 200).map((l) => ({
    ime: String(l?.ime || '').slice(0, 60).trim(),
    pesme: (Array.isArray(l?.pesme) ? l.pesme : []).slice(0, 1000).map((n) => String(n || '').slice(0, 80)),
  })).filter((l) => l.ime);
  return { entries, lists };
}
