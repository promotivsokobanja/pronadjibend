import crypto from 'crypto';
import prisma from '@/lib/prisma';

/** Ključ za program MIDI Konverter Pa5X: u bazi je samo njegov SHA-256, sam ključ vidi samo vlasnik pri pravljenju. */
export function hashProgramKey(key) {
  return crypto.createHash('sha256').update(String(key || '').trim()).digest('hex');
}

export function newProgramKey() {
  return 'pb_' + crypto.randomBytes(24).toString('base64url');
}

/** Vlasnik ključa iz zaglavlja `X-Program-Key` (ključ se ne šalje u URL-u). */
export async function ownerFromProgramKey(request) {
  const key = request.headers.get('x-program-key') || '';
  if (!key.startsWith('pb_') || key.length < 20) return null;
  const hash = hashProgramKey(key);
  const band = await prisma.band.findUnique({ where: { programKeyHash: hash }, select: { id: true, name: true } });
  if (band) return { type: 'band', id: band.id, name: band.name, filter: { bandId: band.id } };
  const mus = await prisma.musicianProfile.findUnique({ where: { programKeyHash: hash }, select: { id: true, name: true } });
  if (mus) return { type: 'musician', id: mus.id, name: mus.name, filter: { musicianProfileId: mus.id } };
  return null;
}

/** Za poređenje naslova: bez kvačica, mala slova, samo slova i brojevi. */
export function normTitle(s) {
  return String(s || '')
    .replace(/[đĐ]/g, 'dj')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^0-9a-z]+/g, ' ')
    .trim();
}
