import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { token, password } = await req.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Nevažeći token.' }, { status: 400 });
    }
    const pwd = String(password || '').trim();
    if (pwd.length < 6) {
      return NextResponse.json({ error: 'Lozinka mora imati najmanje 6 karaktera.' }, { status: 400 });
    }

    // Find valid token
    const rows = await prisma.$queryRawUnsafe(
      `SELECT "id", "email", "expiresAt", "used" FROM "PasswordReset" WHERE "token" = $1 LIMIT 1`,
      token
    );
    const reset = rows[0];

    if (!reset || reset.used) {
      return NextResponse.json({ error: 'Link za reset je nevažeći ili je već iskorišćen.' }, { status: 400 });
    }
    if (new Date(reset.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Link za reset je istekao. Zatražite novi.' }, { status: 400 });
    }

    // Update password
    const hash = await bcrypt.hash(pwd, 10);
    await prisma.user.update({
      where: { email: reset.email },
      data: { password: hash },
    });

    // Mark token as used
    await prisma.$executeRawUnsafe(
      `UPDATE "PasswordReset" SET "used" = true WHERE "id" = $1`,
      reset.id
    );

    return NextResponse.json({ message: 'Lozinka je uspešno promenjena. Možete se prijaviti.' });
  } catch (err) {
    console.error('[reset-password]', err);
    return NextResponse.json({ error: 'Greška pri promeni lozinke.' }, { status: 500 });
  }
}
