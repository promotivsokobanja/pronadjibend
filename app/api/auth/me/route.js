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

    // Check email verification status
    let emailVerified = false;
    try {
      const allRows = await prisma.$queryRawUnsafe(
        `SELECT "verified" FROM "EmailVerification" WHERE "email" = $1 LIMIT 1`,
        user.email
      );
      if (allRows.length === 0) {
        // No verification record exists — account created before verification system
        emailVerified = true;
      } else {
        emailVerified = allRows.some(r => r.verified === true);
      }
    } catch { /* table might not exist yet — don't block */
      emailVerified = true;
    }

    // ADMIN is always considered verified
    if (user.role === 'ADMIN') emailVerified = true;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        bandId: user.bandId,
        plan: user.plan,
        musicianProfileId: user.musicianProfile?.id || null,
        emailVerified,
      },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri čitanju profila.' }, { status: 500 });
  }
}
