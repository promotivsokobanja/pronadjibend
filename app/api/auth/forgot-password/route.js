import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import prisma from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

function getTransport() {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  return nodemailer.createTransport({ host, port, secure, auth: user && pass ? { user, pass } : undefined });
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function POST(req) {
  try {
    const { email } = await req.json();
    const emailClean = String(email || '').trim().toLowerCase();
    if (!emailClean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      return NextResponse.json({ error: 'Unesite validnu email adresu.' }, { status: 400 });
    }

    // Always return success to prevent email enumeration
    const successMsg = { message: 'Ako nalog postoji, link za reset lozinke je poslat na email.' };

    const user = await prisma.user.findUnique({ where: { email: emailClean }, select: { id: true } });
    if (!user) return NextResponse.json(successMsg);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate old tokens
    await prisma.$executeRawUnsafe(
      `UPDATE "PasswordReset" SET "used" = true WHERE "email" = $1 AND "used" = false`,
      emailClean
    );

    // Create new token
    await prisma.$executeRawUnsafe(
      `INSERT INTO "PasswordReset" ("id", "email", "token", "expiresAt") VALUES ($1, $2, $3, $4)`,
      crypto.randomUUID(),
      emailClean,
      token,
      expiresAt
    );

    // Send email
    const transport = getTransport();
    if (transport) {
      const baseUrl = (process.env.NEXTAUTH_URL || 'https://pronadjibend.rs').replace(/\/$/, '');
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      const from = process.env.SMTP_FROM?.trim() || process.env.EMAIL_FROM?.trim() || '"Pronađi Bend" <noreply@pronadjibend.rs>';

      await transport.sendMail({
        from,
        to: emailClean,
        subject: 'Reset lozinke — Pronađi Bend',
        text: `Zdravo,\n\nZatražili ste reset lozinke.\n\nKliknite na link ispod (važi 1 sat):\n${resetUrl}\n\nAko niste vi zatražili reset, ignorišite ovaj email.\n\nPronađi Bend`,
        html: `<p>Zdravo,</p>
<p>Zatražili ste <strong>reset lozinke</strong> na Pronađi Bend platformi.</p>
<p><a href="${esc(resetUrl)}" style="display:inline-block;padding:12px 28px;background:#4d5de8;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">Resetuj lozinku</a></p>
<p style="font-size:0.85rem;color:#64748b">Link važi 1 sat. Ako niste vi zatražili reset, ignorišite ovaj email.</p>`,
      });
    }

    return NextResponse.json(successMsg);
  } catch (err) {
    console.error('[forgot-password]', err);
    return NextResponse.json({ error: 'Greška pri slanju.' }, { status: 500 });
  }
}
