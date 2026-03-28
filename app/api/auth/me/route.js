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

    if (!hasDatabaseUrl()) {
      return databaseUrlMissingResponse();
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        role: true,
        bandId: true,
        plan: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Auth me error:', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri čitanju profila.' }, { status: 500 });
  }
}
