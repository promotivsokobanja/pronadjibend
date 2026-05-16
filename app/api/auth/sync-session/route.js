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
  const { searchParams } = new URL(request.url);
  const requestedRole = searchParams.get('role');
  const VALID_ROLES = ['BAND', 'MUSICIAN', 'CLIENT'];

  let role = nextAuthToken.role;
  let bandId = nextAuthToken.bandId ?? null;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: nextAuthToken.userId },
      select: { id: true, role: true, bandId: true, createdAt: true },
    });
    if (dbUser) {
      role = dbUser.role;
      bandId = dbUser.bandId;

      // If user was just created (< 60s ago) as CLIENT and a valid role was requested, update it
      const ageMs = Date.now() - new Date(dbUser.createdAt).getTime();
      if (
        requestedRole &&
        VALID_ROLES.includes(requestedRole) &&
        dbUser.role === 'CLIENT' &&
        requestedRole !== 'CLIENT' &&
        ageMs < 60_000
      ) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { role: requestedRole },
        });
        role = requestedRole;

        // Create band profile for BAND role
        if (requestedRole === 'BAND') {
          const band = await prisma.band.create({
            data: {
              name: nextAuthToken.name || nextAuthToken.email?.split('@')[0] || 'Moj bend',
              genre: '',
              location: '',
            },
          });
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { bandId: band.id },
          });
          bandId = band.id;
        }

        // Create musician profile for MUSICIAN role
        if (requestedRole === 'MUSICIAN') {
          await prisma.musicianProfile.create({
            data: {
              userId: dbUser.id,
              name: nextAuthToken.name || '',
              primaryInstrument: '',
              city: '',
            },
          });
        }
      }
    }
  } catch (e) {
    console.error('[sync-session] DB lookup/update failed:', e.message);
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
