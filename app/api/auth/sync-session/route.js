import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getToken } from 'next-auth/jwt';
import prisma from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'dev-only-change-me';

const NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'dev-only-change-me';

export async function GET(request) {
  // If user already has a valid auth-token, preserve it (don't overwrite ADMIN with CLIENT)
  const existingToken = request.cookies.get('auth-token')?.value;
  if (existingToken) {
    try {
      const decoded = jwt.verify(existingToken, JWT_SECRET);
      if (decoded?.userId && decoded?.role) {
        let dest = '/clients';
        if (decoded.role === 'ADMIN') dest = '/admin';
        else if (decoded.role === 'BAND') dest = '/bands';
        else if (decoded.role === 'MUSICIAN') dest = '/muzicari/profil';
        const { searchParams } = new URL(request.url);
        const nextParam = searchParams.get('next');
        if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) dest = nextParam;
        return NextResponse.redirect(new URL(dest, request.url));
      }
    } catch { /* expired or invalid — continue to create new one */ }
  }

  const nextAuthToken = await getToken({
    req: request,
    secret: NEXTAUTH_SECRET,
  });

  if (!nextAuthToken?.userId) {
    return NextResponse.redirect(new URL('/login?error=oauth', request.url));
  }

  // Always read fresh user data from database to avoid stale role from JWT cache
  let role = nextAuthToken.role;
  let bandId = nextAuthToken.bandId ?? null;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: nextAuthToken.userId },
      select: { role: true, bandId: true },
    });
    if (dbUser) {
      role = dbUser.role;
      bandId = dbUser.bandId;
    }
  } catch (e) {
    console.error('[sync-session] DB lookup failed:', e.message);
  }

  const token = jwt.sign(
    {
      userId: nextAuthToken.userId,
      email: nextAuthToken.email,
      role,
      bandId,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { searchParams } = new URL(request.url);
  const nextParam = searchParams.get('next');
  let dest = '/clients';
  if (role === 'ADMIN') dest = '/admin';
  else if (role === 'BAND') dest = '/bands';
  else if (role === 'MUSICIAN') dest = '/muzicari/profil';

  if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
    dest = nextParam;
  }

  const res = NextResponse.redirect(new URL(dest, request.url));
  res.cookies.set({
    name: 'auth-token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}
