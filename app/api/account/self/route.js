import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const cookieBase = {
  path: '/',
  maxAge: 0,
  sameSite: 'lax',
};

function clearAuthCookies(response) {
  const secure = process.env.NODE_ENV === 'production';
  response.cookies.set({
    name: 'auth-token',
    value: '',
    ...cookieBase,
    httpOnly: true,
    secure,
  });

  const nextAuthNames = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    '__Host-next-auth.csrf-token',
    'next-auth.csrf-token',
    '__Secure-next-auth.callback-url',
    'next-auth.callback-url',
  ];

  for (const name of nextAuthNames) {
    response.cookies.set({ name, value: '', ...cookieBase, secure });
  }
}

function buildDeletedEmail(email, userId) {
  const local = String(email || '').trim().toLowerCase();
  const stamp = Date.now();
  if (!local.includes('@')) {
    return `deleted+${stamp}-${userId}@deleted.local`;
  }
  return `${local}#deleted-${stamp}-${userId}`;
}

export async function DELETE(request) {
  try {
    const auth = await getAuthUserFromRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Morate biti prijavljeni.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        password: true,
        bandId: true,
        deletedAt: true,
        musicianProfile: { select: { id: true } },
      },
    });

    if (!user || user.deletedAt) {
      const res = NextResponse.json({ success: true });
      clearAuthCookies(res);
      return res;
    }

    const body = await request.json().catch(() => ({}));
    const password = String(body?.password || '').trim();

    if (password) {
      const passOk = await bcrypt.compare(password, user.password || '');
      if (!passOk) {
        return NextResponse.json({ error: 'Lozinka nije ispravna.' }, { status: 400 });
      }
    }

    const deletedAt = new Date();
    const randomPassword = await bcrypt.hash(`${crypto.randomUUID()}${crypto.randomUUID()}`, 10);
    const deletedEmail = buildDeletedEmail(user.email, user.id);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          email: deletedEmail,
          password: randomPassword,
          plan: 'BASIC',
          planUntil: null,
          role: 'CLIENT',
          bandId: null,
          deletedAt,
        },
      });

      if (user.bandId) {
        await tx.band.update({
          where: { id: user.bandId },
          data: { deletedAt },
        });
      }

      if (user.musicianProfile?.id) {
        await tx.musicianProfile.update({
          where: { id: user.musicianProfile.id },
          data: {
            deletedAt,
            isAvailable: false,
          },
        });
      }
    });

    const res = NextResponse.json({ success: true });
    clearAuthCookies(res);
    return res;
  } catch (error) {
    console.error('Account self delete error:', error);
    return NextResponse.json({ error: 'Greška pri brisanju naloga.' }, { status: 500 });
  }
}
