import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import prisma from '../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../lib/auth';
import { createNotification } from '../../../lib/notifications';

function getSmtpTransport() {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  return nodemailer.createTransport({ host, port, secure, auth: user && pass ? { user, pass } : undefined });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const dynamic = 'force-dynamic';

const BODY_MAX = 1000;
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  entry.count += 1;
  rateLimitMap.set(ip, entry);
  return entry.count <= RATE_LIMIT_MAX;
}

// POST — klijent šalje poruku bendu sa javnog profila
export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Previše poruka. Pokušajte ponovo za par minuta.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const bandId = String(body?.bandId || '').trim();
    const senderName = String(body?.senderName || '').trim();
    const senderEmail = String(body?.senderEmail || '').trim();
    const senderPhone = String(body?.senderPhone || '').trim() || null;
    const subject = String(body?.subject || '').trim() || null;
    const msgBody = String(body?.body || '').trim();

    if (!bandId || !senderName || !senderEmail || !msgBody) {
      return NextResponse.json({ error: 'Sva obavezna polja moraju biti popunjena.' }, { status: 400 });
    }
    if (msgBody.length > BODY_MAX) {
      return NextResponse.json({ error: `Poruka može imati najviše ${BODY_MAX} karaktera.` }, { status: 400 });
    }

    const msg = await prisma.contactMessage.create({
      data: { bandId, senderName, senderEmail, senderPhone, subject, body: msgBody },
    });

    // In-app notification + email for band owner
    const bandWithUser = await prisma.band.findUnique({
      where: { id: bandId },
      select: { name: true, user: { select: { id: true, email: true } } },
    });
    if (bandWithUser?.user?.id) {
      createNotification({
        userId: bandWithUser.user.id,
        type: 'SYSTEM',
        title: `Nova poruka od ${senderName}`,
        body: subject || msgBody.slice(0, 80),
        link: '/bands#messages',
      }).catch(() => {});
    }

    // Email obaveštenje bendu
    try {
      const bandEmail = bandWithUser?.user?.email;
      if (bandEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bandEmail)) {
        const transport = getSmtpTransport();
        if (transport) {
          const from = process.env.SMTP_FROM?.trim() || process.env.EMAIL_FROM?.trim() || '"Pronađi Bend" <noreply@pronadjibend.rs>';
          const baseUrl = (process.env.NEXTAUTH_URL || 'https://pronadjibend.rs').replace(/\/$/, '');
          await transport.sendMail({
            from,
            to: bandEmail,
            replyTo: senderEmail,
            subject: `Nova poruka${subject ? ': ' + subject : ''} — ${bandWithUser.name || 'Vaš bend'}`,
            text: [
              'Zdravo,',
              '',
              `Primili ste novu poruku preko Pronađi Bend platforme.`,
              '',
              `Od: ${senderName}`,
              `Email: ${senderEmail}`,
              senderPhone ? `Telefon: ${senderPhone}` : null,
              subject ? `Tema: ${subject}` : null,
              '',
              'Poruka:',
              msgBody,
              '',
              `Kontrolna tabla: ${baseUrl}/bands#messages`,
            ].filter(Boolean).join('\n'),
            html: `<p>Zdravo,</p>
<p>Primili ste <strong>novu poruku</strong> preko Pronađi Bend platforme.</p>
<ul style="line-height:1.6">
<li><strong>Od:</strong> ${escapeHtml(senderName)}</li>
<li><strong>Email:</strong> <a href="mailto:${escapeHtml(senderEmail)}">${escapeHtml(senderEmail)}</a></li>
${senderPhone ? `<li><strong>Telefon:</strong> ${escapeHtml(senderPhone)}</li>` : ''}
${subject ? `<li><strong>Tema:</strong> ${escapeHtml(subject)}</li>` : ''}
</ul>
<p><strong>Poruka:</strong></p>
<p style="white-space:pre-wrap">${escapeHtml(msgBody)}</p>
<p><a href="${escapeHtml(baseUrl)}/bands#messages">Otvori kontrolnu tablu</a></p>`,
          });
        }
      }
    } catch (mailErr) {
      console.error('[contact-message] Email slanje nije uspelo:', mailErr);
    }

    return NextResponse.json({ success: true, id: msg.id });
  } catch (err) {
    console.error('[contact-message] Error:', err);
    return NextResponse.json({ error: 'Greška pri slanju poruke.' }, { status: 500 });
  }
}

// GET — bend čita svoje poruke
export async function GET(req) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: { bandId: true, role: true },
  });

  if (!user?.bandId && user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Pristup odbijen.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const targetBandId = searchParams.get('bandId') || user.bandId;

  if (user.role !== 'ADMIN' && targetBandId !== user.bandId) {
    return NextResponse.json({ error: 'Pristup odbijen.' }, { status: 403 });
  }

  try {
    const messages = await prisma.contactMessage.findMany({
      where: { bandId: targetBandId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ messages });
  } catch (err) {
    console.error('[contact-messages] GET error:', err);
    return NextResponse.json({ error: 'Greška pri učitavanju poruka.' }, { status: 500 });
  }
}

// PATCH — označi poruku kao pročitanu
export async function PATCH(req) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'ID poruke je obavezan.' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: { bandId: true, role: true },
  });

  try {
    const msg = await prisma.contactMessage.findUnique({ where: { id } });
    if (!msg) return NextResponse.json({ error: 'Poruka nije pronađena.' }, { status: 404 });

    if (user.role !== 'ADMIN' && msg.bandId !== user.bandId) {
      return NextResponse.json({ error: 'Pristup odbijen.' }, { status: 403 });
    }

    await prisma.contactMessage.update({ where: { id }, data: { read: true } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[contact-messages] PATCH error:', err);
    return NextResponse.json({ error: 'Greška pri ažuriranju poruke.' }, { status: 500 });
  }
}
