import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const PREMIUM_PLANS = new Set(['PREMIUM', 'PREMIUM_VENUE']);
const MESSAGE_MAX = 2000;
const PAGE_SIZE = 50;
const DELETED_MESSAGE_BODY = 'Poruka je obrisana';

function toErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function hasPremiumPlan(plan) {
  return PREMIUM_PLANS.has(String(plan || '').toUpperCase());
}

async function getAuthenticatedUser(request) {
  const auth = await getAuthUserFromRequest(request);
  if (!auth?.userId) return null;

  return prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      email: true,
      role: true,
      plan: true,
      bandId: true,
      musicianProfile: { select: { id: true } },
    },
  });
}

function isPremiumOrAdmin(user) {
  if (user.role === 'ADMIN') return true;
  return hasPremiumPlan(user.plan);
}

function inviteParticipantsArePremium(invite) {
  const bandPremium = hasPremiumPlan(invite?.band?.user?.plan);
  const musicianPremium = hasPremiumPlan(invite?.musician?.user?.plan);
  return bandPremium && musicianPremium;
}

async function verifyInviteAccess(user, inviteId) {
  const invite = await prisma.musicianInvite.findUnique({
    where: { id: inviteId },
    select: {
      id: true,
      bandId: true,
      musicianId: true,
      senderMusicianId: true,
      band: { select: { user: { select: { plan: true } } } },
      musician: { select: { user: { select: { plan: true } } } },
    },
  });
  if (!invite) return null;

  const isBandOwner = user.bandId && user.bandId === invite.bandId;
  const isMusicianOwner = user.musicianProfile?.id && user.musicianProfile.id === invite.musicianId;
  const isSenderMusician = user.musicianProfile?.id && user.musicianProfile.id === invite.senderMusicianId;
  const isAdmin = user.role === 'ADMIN';

  if (!isBandOwner && !isMusicianOwner && !isSenderMusician && !isAdmin) return null;
  return invite;
}

// GET /api/messages?inviteId=xxx
export async function GET(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 });
    }

    if (!isPremiumOrAdmin(user)) {
      return NextResponse.json(
        { error: 'Chat je dostupan samo za Premium članove.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get('inviteId');
    if (!inviteId) {
      return NextResponse.json({ error: 'inviteId je obavezan.' }, { status: 400 });
    }

    const invite = await verifyInviteAccess(user, inviteId);
    if (!invite) {
      return NextResponse.json({ error: 'Poziv nije pronađen ili nemate pristup.' }, { status: 404 });
    }
    if (!inviteParticipantsArePremium(invite)) {
      return NextResponse.json(
        { error: 'Chat je dostupan samo kada su i bend i muzičar Premium članovi.' },
        { status: 403 }
      );
    }

    const messages = await prisma.message.findMany({
      where: { inviteId },
      orderBy: { createdAt: 'asc' },
      take: PAGE_SIZE,
      select: {
        id: true,
        body: true,
        senderId: true,
        createdAt: true,
        sender: { select: { email: true } },
      },
    });

    return NextResponse.json({ messages, currentUserId: user.id });
  } catch (error) {
    console.error('messages GET', error);
    return NextResponse.json(
      { error: toErrorMessage(error, 'Greška pri učitavanju poruka.') },
      { status: 500 }
    );
  }
}

// POST /api/messages  { inviteId, body }
export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 });
    }

    if (!isPremiumOrAdmin(user)) {
      return NextResponse.json(
        { error: 'Chat je dostupan samo za Premium članove.' },
        { status: 403 }
      );
    }

    const reqBody = await request.json();
    const inviteId = String(reqBody.inviteId || '').trim();
    const body = String(reqBody.body || '').trim();

    if (!inviteId) {
      return NextResponse.json({ error: 'inviteId je obavezan.' }, { status: 400 });
    }
    if (!body) {
      return NextResponse.json({ error: 'Poruka ne može biti prazna.' }, { status: 400 });
    }
    if (body.length > MESSAGE_MAX) {
      return NextResponse.json(
        { error: `Poruka je predugačka (maks. ${MESSAGE_MAX} karaktera).` },
        { status: 400 }
      );
    }

    const invite = await verifyInviteAccess(user, inviteId);
    if (!invite) {
      return NextResponse.json({ error: 'Poziv nije pronađen ili nemate pristup.' }, { status: 404 });
    }
    if (!inviteParticipantsArePremium(invite)) {
      return NextResponse.json(
        { error: 'Chat je dostupan samo kada su i bend i muzičar Premium članovi.' },
        { status: 403 }
      );
    }

    const message = await prisma.message.create({
      data: {
        inviteId,
        senderId: user.id,
        body,
      },
      select: {
        id: true,
        body: true,
        senderId: true,
        createdAt: true,
        sender: { select: { email: true } },
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('messages POST', error);
    return NextResponse.json(
      { error: toErrorMessage(error, 'Greška pri slanju poruke.') },
      { status: 500 }
    );
  }
}

// DELETE /api/messages?messageId=xxx
export async function DELETE(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = String(searchParams.get('messageId') || '').trim();
    if (!messageId) {
      return NextResponse.json({ error: 'messageId je obavezan.' }, { status: 400 });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        inviteId: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Poruka nije pronađena.' }, { status: 404 });
    }

    const invite = await verifyInviteAccess(user, message.inviteId);
    if (!invite) {
      return NextResponse.json({ error: 'Nemate pristup ovoj poruci.' }, { status: 403 });
    }

    const isOwner = message.senderId === user.id;
    const isAdmin = user.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Možete obrisati samo svoje poruke.' }, { status: 403 });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        body: DELETED_MESSAGE_BODY,
      },
      select: {
        id: true,
        body: true,
        senderId: true,
        createdAt: true,
        sender: { select: { email: true } },
      },
    });

    return NextResponse.json({ success: true, message: updatedMessage });
  } catch (error) {
    console.error('messages DELETE', error);
    return NextResponse.json(
      { error: toErrorMessage(error, 'Greška pri brisanju poruke.') },
      { status: 500 }
    );
  }
}
