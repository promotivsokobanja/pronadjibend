import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';
import { upsertInviteBlock } from '@/lib/inviteCommunication';

export const dynamic = 'force-dynamic';

async function getCurrentUser(request) {
  const authUser = await getAuthUserFromRequest(request);
  if (!authUser?.userId) return null;
  return prisma.user.findUnique({
    where: { id: authUser.userId },
    select: {
      id: true,
      role: true,
      bandId: true,
      musicianProfile: { select: { id: true } },
    },
  });
}

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const targetBandId = String(body?.targetBandId || '').trim() || null;
    const targetMusicianId = String(body?.targetMusicianId || '').trim() || null;

    if (!targetBandId && !targetMusicianId) {
      return NextResponse.json({ error: 'Nedostaje cilj blokiranja.' }, { status: 400 });
    }

    if (!currentUser.bandId && !currentUser.musicianProfile?.id) {
      return NextResponse.json({ error: 'Samo bend ili muzičar profil može blokirati komunikaciju.' }, { status: 403 });
    }

    if (currentUser.bandId && targetBandId === currentUser.bandId) {
      return NextResponse.json({ error: 'Ne možete blokirati sopstveni bend.' }, { status: 400 });
    }
    if (currentUser.musicianProfile?.id && targetMusicianId === currentUser.musicianProfile.id) {
      return NextResponse.json({ error: 'Ne možete blokirati sopstveni profil.' }, { status: 400 });
    }

    const block = await upsertInviteBlock({
      blockerBandId: currentUser.bandId || null,
      blockerMusicianId: currentUser.musicianProfile?.id || null,
      blockedBandId: targetBandId,
      blockedMusicianId: targetMusicianId,
    });

    return NextResponse.json({ success: true, block });
  } catch (error) {
    console.error('invite blocks POST', error);
    return NextResponse.json({ error: 'Greška pri blokiranju komunikacije.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetBandId = String(searchParams.get('targetBandId') || '').trim() || null;
    const targetMusicianId = String(searchParams.get('targetMusicianId') || '').trim() || null;

    const result = await prisma.inviteBlock.deleteMany({
      where: {
        blockerBandId: currentUser.bandId || null,
        blockerMusicianId: currentUser.musicianProfile?.id || null,
        blockedBandId: targetBandId,
        blockedMusicianId: targetMusicianId,
      },
    });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error('invite blocks DELETE', error);
    return NextResponse.json({ error: 'Greška pri uklanjanju blokade.' }, { status: 500 });
  }
}
