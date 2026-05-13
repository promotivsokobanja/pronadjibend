import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token je obavezan.' }, { status: 400 });
  }

  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT "id", "email", "expiresAt", "verified" FROM "EmailVerification" WHERE "token" = $1 LIMIT 1`,
      token
    );
    const record = rows[0];

    if (!record) {
      return NextResponse.json({ error: 'Nevažeći link za verifikaciju.' }, { status: 400 });
    }
    if (record.verified) {
      return NextResponse.json({ message: 'Email je već potvrđen.', alreadyVerified: true });
    }
    if (new Date(record.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Link je istekao. Registrujte se ponovo.' }, { status: 400 });
    }

    // Mark as verified
    await prisma.$executeRawUnsafe(
      `UPDATE "EmailVerification" SET "verified" = true WHERE "id" = $1`,
      record.id
    );

    return NextResponse.json({ message: 'Email uspešno potvrđen!', verified: true });
  } catch (err) {
    console.error('[verify-email]', err);
    return NextResponse.json({ error: 'Greška pri verifikaciji.' }, { status: 500 });
  }
}
