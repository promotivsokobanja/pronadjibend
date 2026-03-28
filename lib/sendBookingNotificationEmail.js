import nodemailer from 'nodemailer';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getTransport() {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
}

/**
 * Šalje obaveštenje bendu na email naloga (User.email vezan za bend).
 * Zahteva SMTP env (Netlify / server). Ako SMTP nije podešen, vraća false bez bacanja greške.
 */
export async function sendBookingNotificationToBand({ bandEmail, bandName, booking }) {
  if (!bandEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bandEmail)) {
    console.warn('[booking-email] Bend nema validan email naloga — preskačem slanje.');
    return false;
  }

  const transport = getTransport();
  if (!transport) {
    console.warn(
      '[booking-email] SMTP_HOST nije podešen — mejl se ne šalje (upit je sačuvan u bazi).'
    );
    return false;
  }

  const from =
    process.env.SMTP_FROM?.trim() ||
    process.env.BOOKING_EMAIL_FROM?.trim() ||
    '"Pronađi Bend" <noreply@pronadjibend.rs>';

  const baseUrl = (process.env.NEXTAUTH_URL || 'https://pronadjibend.rs').replace(/\/$/, '');
  const dateStr = new Date(booking.date).toLocaleString('sr-RS', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const text = [
    'Zdravo,',
    '',
    'Primili ste novi upit za nastup preko Pronađi Bend platforme.',
    '',
    `Bend: ${bandName}`,
    `Datum / termin: ${dateStr}`,
    `Klijent: ${booking.clientName || '—'}`,
    `Email klijenta (odgovorite direktno): ${booking.clientEmail}`,
    booking.clientPhone ? `Telefon: ${booking.clientPhone}` : null,
    booking.location ? `Lokacija: ${booking.location}` : null,
    booking.message ? `Poruka od klijenta:\n${booking.message}` : null,
    '',
    `Kontrolna tabla: ${baseUrl}/bands`,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `<p>Zdravo,</p>
<p>Primili ste <strong>novi upit za nastup</strong> preko Pronađi Bend platforme.</p>
<ul style="line-height:1.6">
<li><strong>Bend:</strong> ${escapeHtml(bandName)}</li>
<li><strong>Datum:</strong> ${escapeHtml(dateStr)}</li>
<li><strong>Klijent:</strong> ${escapeHtml(booking.clientName || '—')}</li>
<li><strong>Email klijenta:</strong> <a href="mailto:${escapeHtml(booking.clientEmail)}">${escapeHtml(booking.clientEmail)}</a></li>
${booking.clientPhone ? `<li><strong>Telefon:</strong> ${escapeHtml(booking.clientPhone)}</li>` : ''}
${booking.location ? `<li><strong>Lokacija:</strong> ${escapeHtml(booking.location)}</li>` : ''}
</ul>
${booking.message ? `<p><strong>Poruka od klijenta:</strong></p><p style="white-space:pre-wrap">${escapeHtml(booking.message)}</p>` : ''}
<p><a href="${escapeHtml(baseUrl)}/bands">Otvori kontrolnu tablu</a></p>`;

  await transport.sendMail({
    from,
    to: bandEmail,
    replyTo: booking.clientEmail,
    subject: `Novi upit za nastup — ${bandName}`,
    text,
    html,
  });

  return true;
}
