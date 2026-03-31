import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import {
  databaseUrlMissingResponse,
  hasDatabaseUrl,
  responseFromDatabaseError,
} from '../../../../lib/dbClientErrors';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'dev-only-change-me';
/** Fiksni bcrypt hash za usporedbu kad korisnik ne postoji — sprečava timing/user enumeration. */
const BCRYPT_DUMMY_HASH =
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isBcryptHash(value) {
  const hash = String(value || '');
  return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$');
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/auth/login',
    method: 'POST',
    message: 'Use POST to authenticate user.',
  });
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Neispravan format zahteva.' }, { status: 400 });
    }
    const { email, password } = body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');

    if (!normalizedEmail || !normalizedPassword) {
      return NextResponse.json(
        { error: 'Email i lozinka su obavezni.' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Email format nije ispravan.' }, { status: 400 });
    }

    if (normalizedPassword.length < 6 || normalizedPassword.length > 128) {
      return NextResponse.json({ error: 'Lozinka mora imati 6-128 karaktera.' }, { status: 400 });
    }

    if (process.env.NODE_ENV === 'production' && (!JWT_SECRET || JWT_SECRET.length < 32)) {
      return NextResponse.json(
        { error: 'Server konfiguracija nije bezbedna. Kontaktirajte podršku.' },
        { status: 500 }
      );
    }

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        role: true,
        password: true,
        bandId: true,
      },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          email: true,
          role: true,
          password: true,
          bandId: true,
        },
      });
    }

    const storedPassword = String(user?.password || '');
    const hashToVerify = user ? storedPassword : BCRYPT_DUMMY_HASH;
    let passwordMatch = await bcrypt.compare(normalizedPassword, hashToVerify);

    if (!passwordMatch && user && !isBcryptHash(storedPassword)) {
      passwordMatch = normalizedPassword === storedPassword;
      if (passwordMatch) {
        const upgradedHash = await bcrypt.hash(normalizedPassword, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: upgradedHash },
        });
      }
    }

    if (!user || !passwordMatch) {
      return NextResponse.json(
        { error: 'Neispravan email ili lozinka.' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, bandId: user.bandId || null },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const response = NextResponse.json({ 
      success: true, 
      user: { email: user.email, role: user.role, bandId: user.bandId || null } 
    });

    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login Error:', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri prijavi.' }, { status: 500 });
  }
}
