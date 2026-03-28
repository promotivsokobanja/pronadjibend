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
    Math.max(1, parseInt(searchParams.get('limit') || '30', 10) || 30)
  );
  const skip = (page - 1) * limit;

  try {
    const [total, events] = await Promise.all([
      prisma.billingEvent.count(),
      prisma.billingEvent.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      events,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('admin/billing GET', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri učitavanju naplata.' }, { status: 500 });
  }
}
