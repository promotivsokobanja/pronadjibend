import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const CODE_RE = /^(PC|TB)-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_WAITING = 500;

function code(v) {
  return String(v || '').trim().toUpperCase();
}

/**
 * Program / tablet traži ključ: { code: "PC-XXXX-XXXX" | "TB-…", name, email, note }.
 * Isti kod ponovo → ažurira ime i mejl (izdat ključ ostaje). Ključ izdaje vlasnik u alatu „Pa5X Ključevi“.
 */
export async function POST(request) {
  let b;
  try { b = await request.json(); } catch { return NextResponse.json({ error: 'Neispravan format zahteva.' }, { status: 400 }); }
  const c = code(b?.code);
  const name = String(b?.name || '').trim().slice(0, 80);
  const email = String(b?.email || '').trim().toLowerCase().slice(0, 120);
  const note = String(b?.note || '').trim().slice(0, 300) || null;
  if (!CODE_RE.test(c)) return NextResponse.json({ error: 'Neispravan kod uređaja.' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'Upiši ime ili ime benda.' }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Upiši ispravan mejl.' }, { status: 400 });
  try {
    const old = await prisma.pa5xKeyRequest.findUnique({ where: { code: c } });
    if (old) {
      const r = await prisma.pa5xKeyRequest.update({
        where: { code: c },
        data: { name, email, note, ...(old.status === 'odbijen' ? { status: 'ceka' } : {}) },
      });
      return NextResponse.json({ status: r.status, key: r.status === 'izdat' ? r.key : null });
    }
    if ((await prisma.pa5xKeyRequest.count({ where: { status: 'ceka' } })) >= MAX_WAITING) {
      return NextResponse.json({ error: 'Previše zahteva na čekanju – pokušaj kasnije.' }, { status: 429 });
    }
    await prisma.pa5xKeyRequest.create({ data: { code: c, name, email, note } });
    return NextResponse.json({ status: 'ceka', key: null });
  } catch (e) {
    console.error('Pa5X zahtev:', e);
    return NextResponse.json({ error: 'Greška na sajtu.' }, { status: 500 });
  }
}

/** Stanje zahteva za ovaj uređaj: GET ?code=PC-… → { status, key } (ključ važi samo za taj uređaj). */
export async function GET(request) {
  const c = code(new URL(request.url).searchParams.get('code'));
  if (!CODE_RE.test(c)) return NextResponse.json({ error: 'Neispravan kod uređaja.' }, { status: 400 });
  try {
    const r = await prisma.pa5xKeyRequest.findUnique({ where: { code: c } });
    if (!r) return NextResponse.json({ status: 'nema', key: null });
    return NextResponse.json({ status: r.status, key: r.status === 'izdat' ? r.key : null });
  } catch (e) {
    console.error('Pa5X zahtev:', e);
    return NextResponse.json({ error: 'Greška na sajtu.' }, { status: 500 });
  }
}
