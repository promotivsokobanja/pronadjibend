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

function formatBookingDateSr(date) {
  return new Date(date).toLocaleString('sr-RS', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

/**
 * Šalje obaveštenje bendu na email naloga (User.email vezan za bend).
 * `booking` — jedan upit; `bookings` — više dana (jedan mejl sa svim terminima).
 */
export async function sendBookingNotificationToBand({ bandEmail, bandName, booking, bookings }) {
  const list =
    Array.isArray(bookings) && bookings.length > 0
      ? [...bookings].sort((a, b) => new Date(a.date) - new Date(b.date))
      : booking
        ? [booking]
        : [];

  if (!list.length) return false;

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
  const first = list[0];
  const multi = list.length > 1;
  const datesLines = list.map((b) => `• ${formatBookingDateSr(b.date)}`).join('\n');
  const datesHtml = list
    .map((b) => `<li>${escapeHtml(formatBookingDateSr(b.date))}</li>`)
    .join('');

  const text = [
    'Zdravo,',
    '',
    multi
      ? `Primili ste novi upit za nastup (${list.length} dana) preko Pronađi Bend platforme.`
      : 'Primili ste novi upit za nastup preko Pronađi Bend platforme.',
    '',
    `Bend: ${bandName}`,
    multi ? `Datumi / termini:\n${datesLines}` : `Datum / termin: ${formatBookingDateSr(first.date)}`,
    `Klijent: ${first.clientName || '—'}`,
    `Email klijenta (odgovorite direktno): ${first.clientEmail}`,
    first.clientPhone ? `Telefon: ${first.clientPhone}` : null,
    first.location ? `Lokacija: ${first.location}` : null,
    first.message ? `Poruka od klijenta:\n${first.message}` : null,
    '',
    `Kontrolna tabla: ${baseUrl}/bands`,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `<p>Zdravo,</p>
<p>Primili ste <strong>${multi ? `novi upit za nastup (${list.length} dana)` : 'novi upit za nastup'}</strong> preko Pronađi Bend platforme.</p>
<ul style="line-height:1.6">
<li><strong>Bend:</strong> ${escapeHtml(bandName)}</li>
${
  multi
    ? `<li><strong>Datumi:</strong><ul style="margin:0.35em 0 0 1.1em;padding:0">${datesHtml}</ul></li>`
    : `<li><strong>Datum:</strong> ${escapeHtml(formatBookingDateSr(first.date))}</li>`
}
<li><strong>Klijent:</strong> ${escapeHtml(first.clientName || '—')}</li>
<li><strong>Email klijenta:</strong> <a href="mailto:${escapeHtml(first.clientEmail)}">${escapeHtml(first.clientEmail)}</a></li>
${first.clientPhone ? `<li><strong>Telefon:</strong> ${escapeHtml(first.clientPhone)}</li>` : ''}
${first.location ? `<li><strong>Lokacija:</strong> ${escapeHtml(first.location)}</li>` : ''}
</ul>
${first.message ? `<p><strong>Poruka od klijenta:</strong></p><p style="white-space:pre-wrap">${escapeHtml(first.message)}</p>` : ''}
<p><a href="${escapeHtml(baseUrl)}/bands">Otvori kontrolnu tablu</a></p>`;

  await transport.sendMail({
    from,
    to: bandEmail,
    replyTo: first.clientEmail,
    subject: multi
      ? `Novi upit (${list.length} dana) — ${bandName}`
      : `Novi upit za nastup — ${bandName}`,
    text,
    html,
  });

  return true;
}

/** Kad admin u panelu potvrdi rezervaciju (CONFIRMED) — obavesti bend i klijenta. */
export async function sendBookingConfirmedEmails({ bandEmail, bandName, booking }) {
  const transport = getTransport();
  if (!transport) {
    console.warn('[booking-email] Potvrda: SMTP nije podešen — mejl se ne šalje.');
    return { band: false, client: false };
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

  const summaryText = [
    `Bend: ${bandName}`,
    `Datum: ${dateStr}`,
    `Klijent: ${booking.clientName || '—'}`,
    booking.location ? `Lokacija: ${booking.location}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const summaryHtml = `<ul style="line-height:1.6">
<li><strong>Bend:</strong> ${escapeHtml(bandName)}</li>
<li><strong>Datum:</strong> ${escapeHtml(dateStr)}</li>
<li><strong>Klijent:</strong> ${escapeHtml(booking.clientName || '—')}</li>
${booking.location ? `<li><strong>Lokacija:</strong> ${escapeHtml(booking.location)}</li>` : ''}
</ul>`;

  let bandOk = false;
  let clientOk = false;

  if (bandEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bandEmail)) {
    await transport.sendMail({
      from,
      to: bandEmail,
      subject: `Potvrđena rezervacija — ${bandName}`,
      text: [
        'Zdravo,',
        '',
        'Rezervacija / upit je u administraciji označen kao POTVRĐEN.',
        '',
        summaryText,
        '',
        `Kontrolna tabla: ${baseUrl}/bands`,
      ].join('\n'),
      html: `<p>Zdravo,</p>
<p>Rezervacija je u administraciji označena kao <strong>potvrđena (CONFIRMED)</strong>.</p>
${summaryHtml}
<p><a href="${escapeHtml(baseUrl)}/bands">Kontrolna tabla</a></p>`,
    });
    bandOk = true;
  }

  const clientEmail = booking.clientEmail?.trim();
  if (clientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    await transport.sendMail({
      from,
      to: clientEmail,
      replyTo: bandEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bandEmail) ? bandEmail : undefined,
      subject: `Potvrđena rezervacija — ${bandName} | Pronađi Bend`,
      text: [
        `Poštovani/a ${booking.clientName || ''},`,
        '',
        `Vaš upit za nastup benda "${bandName}" je potvrđen.`,
        '',
        summaryText,
        '',
        'Bend će Vas kontaktirati za dalje detalje.',
        '',
        `Sajt: ${baseUrl}`,
      ]
        .filter(Boolean)
        .join('\n'),
      html: `<p>Poštovani/a ${escapeHtml(booking.clientName || 'klijente')},</p>
<p>Vaš upit za nastup benda <strong>${escapeHtml(bandName)}</strong> je <strong>potvrđen</strong>.</p>
${summaryHtml}
<p>Bend će Vas kontaktirati za dalje detalje.</p>
<p><a href="${escapeHtml(baseUrl)}">Pronađi Bend</a></p>`,
    });
    clientOk = true;
  }

  return { band: bandOk, client: clientOk };
}
