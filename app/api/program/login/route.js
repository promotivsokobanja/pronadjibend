import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashProgramKey, newProgramKey } from '@/lib/programKey';

export const dynamic = 'force-dynamic';

/** Isto kao /api/auth/login: poređenje i kad korisnik ne postoji (bez otkrivanja da li mejl postoji). */
const BCRYPT_DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_DEVICES = 10;

/**
 * Prijava iz programa Pa5X Studio / tableta mejlom i lozinkom sa sajta → ključ za OVAJ uređaj (svaki uređaj svoj).
 * Telo: { email, password, device } (device = npr. „Računar PC-25XW-M7KB“). Lozinka se nigde ne čuva.
 */
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Neispravan format zahteva.' }, { status: 400 }); }
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '').trim();
  const label = String(body?.device || '').trim().slice(0, 80) || 'Uređaj';
  if (!email || !password) return NextResponse.json({ error: 'Email i lozinka su obavezni.' }, { status: 400 });
  if (!EMAIL_REGEX.test(email) || password.length < 6 || password.length > 128) {
    return NextResponse.json({ error: 'Neispravan email ili lozinka.' }, { status: 401 });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, password: true, deletedAt: true, bandId: true, musicianProfile: { select: { id: true } } },
    });
    const ok = await bcrypt.compare(password, user?.password ?? BCRYPT_DUMMY_HASH);
    if (!user || !ok || user.deletedAt) return NextResponse.json({ error: 'Neispravan email ili lozinka.' }, { status: 401 });

    let owner = null;
    if (user.bandId) {
      const b = await prisma.band.findUnique({ where: { id: user.bandId }, select: { id: true, name: true } });
      if (b) owner = { bandId: b.id, name: b.name };
    }
    if (!owner && user.musicianProfile?.id) {
      const m = await prisma.musicianProfile.findUnique({ where: { id: user.musicianProfile.id }, select: { id: true, name: true } });
      if (m) owner = { musicianProfileId: m.id, name: m.name };
    }
    if (!owner) {
      return NextResponse.json({ error: 'Nalog nema profil benda ili muzičara – napravi ga na sajtu (Portal za muzičare).' }, { status: 403 });
    }

    const where = owner.bandId ? { bandId: owner.bandId } : { musicianProfileId: owner.musicianProfileId };
    // isti uređaj se ponovo prijavio → stari ključ tog uređaja prestaje da važi
    await prisma.programDevice.deleteMany({ where: { ...where, label } });
    const old = await prisma.programDevice.findMany({ where, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (old.length >= MAX_DEVICES) {
      await prisma.programDevice.deleteMany({ where: { id: { in: old.slice(0, old.length - MAX_DEVICES + 1).map((d) => d.id) } } });
    }
    const key = newProgramKey();
    await prisma.programDevice.create({ data: { ...where, label, keyHash: hashProgramKey(key) } });
    return NextResponse.json({ key, name: owner.name });
  } catch (error) {
    console.error('Program login error:', error);
    return NextResponse.json({ error: 'Greška pri prijavi.' }, { status: 500 });
  }
}
