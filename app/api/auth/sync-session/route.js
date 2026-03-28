import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getToken } from 'next-auth/jwt';

export const dynamic = 'force-dynamic';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'dev-only-change-me';

const NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'dev-only-change-me';

export async function GET(request) {
  const nextAuthToken = await getToken({
    req: request,
    secret: NEXTAUTH_SECRET,
  });

  if (!nextAuthToken?.userId) {
    return NextResponse.redirect(new URL('/login?error=oauth', request.url));
  }

  const token = jwt.sign(
    {
      userId: nextAuthToken.userId,
      email: nextAuthToken.email,
      role: nextAuthToken.role,
      bandId: nextAuthToken.bandId ?? null,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { searchParams } = new URL(request.url);
  const nextParam = searchParams.get('next');
  let dest = '/clients';
  if (nextAuthToken.role === 'ADMIN') dest = '/admin';
  else if (nextAuthToken.role === 'BAND') dest = '/bands';

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
