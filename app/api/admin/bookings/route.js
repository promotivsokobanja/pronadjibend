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
    Math.max(1, parseInt(searchParams.get('limit') || '25', 10) || 25)
  );
  const status = searchParams.get('status') || '';
  const skip = (page - 1) * limit;

  try {
    const where =
      status && ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status)
        ? { status }
        : {};

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          clientName: true,
          clientEmail: true,
          clientPhone: true,
          date: true,
          status: true,
          message: true,
          location: true,
          price: true,
          createdAt: true,
          band: { select: { id: true, name: true, location: true } },
        },
      }),
    ]);

    return NextResponse.json({
      bookings,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('admin/bookings GET', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri učitavanju rezervacija.' }, { status: 500 });
  }
}

const STATUSES = new Set(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']);

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
  const status = body.status !== undefined ? String(body.status).toUpperCase() : null;
  if (!id || !status || !STATUSES.has(status)) {
    return NextResponse.json(
      { error: 'Nedostaje id ili je status neispravan.' },
      { status: 400 }
    );
  }

  try {
    const booking = await prisma.booking.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        status: true,
        clientName: true,
        band: { select: { name: true } },
      },
    });
    return NextResponse.json({ booking });
  } catch (error) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Rezervacija nije pronađena.' }, { status: 404 });
    }
    console.error('admin/bookings PATCH', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri ažuriranju.' }, { status: 500 });
  }
}
