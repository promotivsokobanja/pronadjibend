import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const cookieBase = {
  path: '/',
  maxAge: 0,
  sameSite: 'lax',
};

export async function POST() {
  const secure = process.env.NODE_ENV === 'production';
  const res = NextResponse.json({ ok: true });

  res.cookies.set({
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
    res.cookies.set({ name, value: '', ...cookieBase, secure });
  }

  return res;
}
