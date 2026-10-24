import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isPa5xAdmin } from '@/lib/pa5xAdmin';

export const dynamic = 'force-dynamic';

const KEY_RE = /^PA5X-[A-Z2-7-]{20,400}$/;

/** Za alat „Pa5X Ključevi“ (zaglavlje X-Pa5x-Admin): zahtevi – ?status=ceka (podrazumevano) | sve. */
export async function GET(request) {
  if (!isPa5xAdmin(request)) return NextResponse.json({ error: 'Nije dozvoljeno.' }, { status: 403 });
  const st = new URL(request.url).searchParams.get('status') || 'ceka';
  const rows = await prisma.pa5xKeyRequest.findMany({
    where: st === 'sve' ? {} : { status: st },
    orderBy: { createdAt: 'asc' },
    take: 500,
    select: { id: true, code: true, name: true, email: true, note: true, status: true, createdAt: true },
  });
  return NextResponse.json({ requests: rows });
}

/** Izdaj ključ { id, key } ili odbij { id, reject: true }. Ključ potpisuje alat kod vlasnika – sajt ga samo čuva. */
export async function POST(request) {
  if (!isPa5xAdmin(request)) return NextResponse.json({ error: 'Nije dozvoljeno.' }, { status: 403 });
  let b;
  try { b = await request.json(); } catch { return NextResponse.json({ error: 'Neispravan format zahteva.' }, { status: 400 }); }
  const id = String(b?.id || '');
  const r = await prisma.pa5xKeyRequest.findUnique({ where: { id } });
  if (!r) return NextResponse.json({ error: 'Nema takvog zahteva.' }, { status: 404 });
  if (b?.reject) {
    await prisma.pa5xKeyRequest.update({ where: { id }, data: { status: 'odbijen', key: null } });
    return NextResponse.json({ ok: true, status: 'odbijen' });
  }
  const key = String(b?.key || '').trim().toUpperCase();
  if (!KEY_RE.test(key)) return NextResponse.json({ error: 'Neispravan ključ.' }, { status: 400 });
  await prisma.pa5xKeyRequest.update({ where: { id }, data: { status: 'izdat', key } });
  return NextResponse.json({ ok: true, status: 'izdat' });
}
