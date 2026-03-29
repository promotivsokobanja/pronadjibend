import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';
import { requireAdmin } from '../../../../../../lib/adminAuth';
import { responseFromDatabaseError } from '../../../../../../lib/dbClientErrors';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: 'Nedostaje ID benda.' }, { status: 400 });
  }

  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Neispravan JSON.' }, { status: 400 });
    }

    if (typeof body.isPaid !== 'boolean') {
      return NextResponse.json({ error: 'Polje isPaid mora biti boolean.' }, { status: 400 });
    }

    const exists = await prisma.band.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      return NextResponse.json({ error: 'Bend nije pronađen.' }, { status: 404 });
    }

    const updated = await prisma.band.update({
      where: { id },
      data: {
        isPaid: body.isPaid,
        plan: body.isPaid ? 'PRO' : 'FREE',
      },
      select: { id: true, isPaid: true, plan: true },
    });

    return NextResponse.json({ ok: true, isPaid: updated.isPaid, plan: updated.plan });
  } catch (error) {
    console.error('admin/bands/[id]/paid PATCH', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri ažuriranju.' }, { status: 500 });
  }
}
