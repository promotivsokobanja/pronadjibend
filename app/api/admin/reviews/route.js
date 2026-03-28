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
  const skip = (page - 1) * limit;

  try {
    const [total, reviews] = await Promise.all([
      prisma.review.count(),
      prisma.review.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rating: true,
          comment: true,
          author: true,
          createdAt: true,
          band: { select: { id: true, name: true, location: true } },
        },
      }),
    ]);

    return NextResponse.json({
      reviews,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('admin/reviews GET', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri učitavanju recenzija.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Nedostaje id.' }, { status: 400 });
  }

  try {
    await prisma.review.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Recenzija nije pronađena.' }, { status: 404 });
    }
    console.error('admin/reviews DELETE', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri brisanju.' }, { status: 500 });
  }
}
