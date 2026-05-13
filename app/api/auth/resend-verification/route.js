import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { sendVerificationEmail } from '../../../../lib/sendVerificationEmail';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { email } = await req.json();
    const emailClean = String(email || '').trim().toLowerCase();
    if (!emailClean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      return NextResponse.json({ error: 'Unesite validnu email adresu.' }, { status: 400 });
    }

    const successMsg = { message: 'Ako nalog postoji, verifikacioni email je ponovo poslat.' };

    const user = await prisma.user.findUnique({ where: { email: emailClean }, select: { id: true } });
    if (!user) return NextResponse.json(successMsg);

    // Check if already verified
    const verified = await prisma.$queryRawUnsafe(
      `SELECT 1 FROM "EmailVerification" WHERE "email" = $1 AND "verified" = true LIMIT 1`,
      emailClean
    );
    if (verified.length > 0) {
      return NextResponse.json({ message: 'Email je već potvrđen.' });
    }

    // Rate limit: max 1 per 2 minutes
    const recent = await prisma.$queryRawUnsafe(
      `SELECT 1 FROM "EmailVerification" WHERE "email" = $1 AND "createdAt" > NOW() - INTERVAL '2 minutes' AND "verified" = false LIMIT 1`,
      emailClean
    );
    if (recent.length > 0) {
      return NextResponse.json({ error: 'Već ste zatražili verifikaciju. Sačekajte 2 minuta.' }, { status: 429 });
    }

    await sendVerificationEmail(emailClean);
    return NextResponse.json(successMsg);
  } catch (err) {
    console.error('[resend-verification]', err);
    return NextResponse.json({ error: 'Greška pri slanju.' }, { status: 500 });
  }
}
