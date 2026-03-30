import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { requireAdmin } from '../../../../../lib/adminAuth';
import { responseFromDatabaseError } from '../../../../../lib/dbClientErrors';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 50;

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20)
  );
  const search = String(searchParams.get('search') || '').trim();
  const status = String(searchParams.get('status') || 'PENDING').trim().toUpperCase();
  const skip = (page - 1) * limit;

  const where = {};
  if (status && status !== 'SVE') {
    where.status = status;
  }
  if (search.length >= 2) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { artist: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [total, submissions] = await Promise.all([
      prisma.songSubmission.count({ where }),
      prisma.songSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const bandIds = Array.from(
      new Set(
        submissions
          .map((s) => s.submittedByBandId)
          .filter(Boolean)
      )
    );

    const bands = bandIds.length
      ? await prisma.band.findMany({
          where: { id: { in: bandIds } },
          select: { id: true, name: true },
        })
      : [];

    const bandNameById = bands.reduce((acc, band) => {
      acc[band.id] = band.name;
      return acc;
    }, {});

    return NextResponse.json({
      submissions: submissions.map((s) => ({
        ...s,
        submittedByBandName: s.submittedByBandId
          ? bandNameById[s.submittedByBandId] || 'Nepoznat bend'
          : null,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error('admin pesmarica submissions GET', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri učitavanju predloga.' }, { status: 500 });
  }
}
