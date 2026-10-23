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
  // ključ uređaja prijavljenog iz programa / tableta (mejl + lozinka)
  let dev = null;
  try {
    dev = await prisma.programDevice.findUnique({ where: { keyHash: hash } });
  } catch {
    return null;                                  // tabela još nije napravljena na bazi
  }
  if (!dev) return null;
  if (!dev.lastUsedAt || Date.now() - dev.lastUsedAt.getTime() > 3600_000) {   // ne pišemo pri svakom pozivu (anketa na 3 s)
    prisma.programDevice.update({ where: { id: dev.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }
  if (dev.bandId) {
    const b = await prisma.band.findUnique({ where: { id: dev.bandId }, select: { id: true, name: true } });
    if (b) return { type: 'band', id: b.id, name: b.name, filter: { bandId: b.id }, deviceId: dev.id };
  }
  if (dev.musicianProfileId) {
    const m = await prisma.musicianProfile.findUnique({ where: { id: dev.musicianProfileId }, select: { id: true, name: true } });
    if (m) return { type: 'musician', id: m.id, name: m.name, filter: { musicianProfileId: m.id }, deviceId: dev.id };
  }
  return null;
}

/** Nalog (User) vlasnika ključa – za plan (npr. Korg set samo za Premium Venue). */
export async function userOfOwner(owner) {
  if (!owner) return null;
  const select = { id: true, role: true, plan: true, deletedAt: true };
  if (owner.type === 'band') return prisma.user.findUnique({ where: { bandId: owner.id }, select });
  const m = await prisma.musicianProfile.findUnique({ where: { id: owner.id }, select: { userId: true } });
  return m?.userId ? prisma.user.findUnique({ where: { id: m.userId }, select }) : null;
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
