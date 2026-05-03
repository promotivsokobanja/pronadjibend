import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { requireAdmin } from '../../../../lib/adminAuth';
import { responseFromDatabaseError } from '../../../../lib/dbClientErrors';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 100;
const PREMIUM_PLANS = new Set(['PREMIUM', 'PREMIUM_VENUE']);

function hasPremiumPlan(plan) {
  return PREMIUM_PLANS.has(String(plan || '').toUpperCase());
}

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20)
  );
  const status = String(searchParams.get('status') || '').trim().toUpperCase();
  const skip = (page - 1) * limit;

  try {
    const where = status ? { status } : {};

    const [total, invites] = await Promise.all([
      prisma.musicianInvite.count({ where }),
      prisma.musicianInvite.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          band: { select: { id: true, name: true, user: { select: { plan: true } } } },
          musician: {
            select: {
              id: true,
              name: true,
              primaryInstrument: true,
              city: true,
              user: { select: { plan: true } },
            },
          },
          senderMusician: {
            select: {
              id: true,
              name: true,
              primaryInstrument: true,
            },
          },
          _count: { select: { messages: true } },
        },
      }),
    ]);

    const mappedInvites = invites.map((invite) => {
      const bandPlan = invite?.band?.user?.plan || null;
      const musicianPlan = invite?.musician?.user?.plan || null;
      const premiumChatEnabled = hasPremiumPlan(bandPlan) && hasPremiumPlan(musicianPlan);
      return {
        ...invite,
        bandPlan,
        musicianPlan,
        premiumChatEnabled,
      };
    });

    return NextResponse.json({
      invites: mappedInvites,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('admin/musician-invites GET', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri učitavanju poziva muzičarima.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Nedostaje id poziva.' }, { status: 400 });
  }

  try {
    const existing = await prisma.musicianInvite.findUnique({
      where: { id },
      select: { id: true, _count: { select: { messages: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Poziv nije pronađen.' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.message.deleteMany({ where: { inviteId: id } }),
      prisma.musicianInvite.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true, deletedMessages: existing._count.messages });
  } catch (error) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Poziv nije pronađen.' }, { status: 404 });
    }
    console.error('admin/musician-invites DELETE', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri brisanju poziva.' }, { status: 500 });
  }
}

const INVITE_STATUSES = new Set(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED']);

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
  if (!id || !status || !INVITE_STATUSES.has(status)) {
    return NextResponse.json(
      { error: 'Nedostaje id ili je status neispravan.' },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.musicianInvite.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Poziv nije pronađen.' }, { status: 404 });
    }

    const updated = await prisma.musicianInvite.update({
      where: { id },
      data: { status },
      include: {
        band: { select: { id: true, name: true } },
        musician: { select: { id: true, name: true, primaryInstrument: true } },
      },
    });

    return NextResponse.json({ success: true, invite: updated });
  } catch (error) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Poziv nije pronađen.' }, { status: 404 });
    }
    console.error('admin/musician-invites PATCH', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri ažuriranju poziva.' }, { status: 500 });
  }
}
