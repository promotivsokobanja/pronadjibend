import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../../lib/auth';
import {
  databaseUrlMissingResponse,
  hasDatabaseUrl,
  responseFromDatabaseError,
} from '../../../../lib/dbClientErrors';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser?.userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        role: true,
        bandId: true,
        plan: true,
        deletedAt: true,
        musicianProfile: { select: { id: true } },
      },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        bandId: user.bandId,
        plan: user.plan,
        musicianProfileId: user.musicianProfile?.id || null,
      },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri čitanju profila.' }, { status: 500 });
  }
}
