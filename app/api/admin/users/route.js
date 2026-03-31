import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { requireAdmin } from '../../../../lib/adminAuth';
import { responseFromDatabaseError } from '../../../../lib/dbClientErrors';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 100;

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20)
  );
  const search = String(searchParams.get('search') || '').trim().toLowerCase();
  const skip = (page - 1) * limit;

  try {
    const where = search ? { email: { contains: search, mode: 'insensitive' } } : {};

    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          plan: true,
          planUntil: true,
          createdAt: true,
          bandId: true,
          band: { select: { id: true, name: true, location: true } },
        },
      }),
    ]);

    return NextResponse.json({
      users: rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('admin/users GET', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri učitavanju korisnika.' }, { status: 500 });
  }
}

const ROLES = new Set(['ADMIN', 'BAND', 'CLIENT']);

export async function PATCH(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neispravan JSON.' }, { status: 400 });
  }

  const id = body.id;
  if (!id) {
    return NextResponse.json({ error: 'Nedostaje id.' }, { status: 400 });
  }

  const data = {};
  if (body.role !== undefined) {
    const r = String(body.role).toUpperCase();
    if (!ROLES.has(r)) {
      return NextResponse.json({ error: 'Nepoznata uloga.' }, { status: 400 });
    }
    data.role = r;
  }
  if (body.plan !== undefined) {
    const p = String(body.plan).trim().toUpperCase();
    if (!p || p.length > 48) {
      return NextResponse.json({ error: 'Plan neispravan.' }, { status: 400 });
    }
    data.plan = p;
  }
  if (body.planUntil !== undefined) {
    if (body.planUntil === null || body.planUntil === '') {
      data.planUntil = null;
    } else {
      const d = new Date(body.planUntil);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Neispravan datum planUntil.' }, { status: 400 });
      }
      data.planUntil = d;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nema polja za ažuriranje.' }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        plan: true,
        planUntil: true,
        bandId: true,
        band: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ user: updated });
  } catch (error) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Korisnik nije pronađen.' }, { status: 404 });
    }
    console.error('admin/users PATCH', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri ažuriranju.' }, { status: 500 });
  }
}
