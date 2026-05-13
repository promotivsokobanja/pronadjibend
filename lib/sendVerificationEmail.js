import crypto from 'crypto';
import nodemailer from 'nodemailer';
import prisma from './prisma';

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

export async function sendVerificationEmail(email) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  await prisma.$executeRawUnsafe(
    `INSERT INTO "EmailVerification" ("id", "email", "token", "expiresAt") VALUES ($1, $2, $3, $4)`,
    crypto.randomUUID(),
    email,
    token,
    expiresAt
  );

  const transport = getTransport();
  if (!transport) return;

  const baseUrl = (process.env.NEXTAUTH_URL || 'https://pronadjibend.rs').replace(/\/$/, '');
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
  const from = process.env.SMTP_FROM?.trim() || process.env.EMAIL_FROM?.trim() || '"Pronađi Bend" <noreply@pronadjibend.rs>';

  await transport.sendMail({
    from,
    to: email,
    subject: 'Potvrdite email adresu — Pronađi Bend',
    text: `Zdravo,\n\nHvala na registraciji! Potvrdite email adresu klikom na link:\n${verifyUrl}\n\nLink važi 24 sata.\n\nPronađi Bend`,
    html: `<p>Zdravo,</p>
<p>Hvala na registraciji na <strong>Pronađi Bend</strong> platformi!</p>
<p>Potvrdite email adresu klikom na dugme ispod:</p>
<p><a href="${esc(verifyUrl)}" style="display:inline-block;padding:12px 28px;background:#4d5de8;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">Potvrdi email</a></p>
<p style="font-size:0.85rem;color:#64748b">Link važi 24 sata.</p>`,
  });
}
