import nodemailer from 'nodemailer';
import { getInviteCommunicationSettings } from './inviteCommunication';

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

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('sr-RS', { dateStyle: 'long', timeStyle: 'short' });
}

export async function sendMusicianInviteNotificationEmail({
  recipientEmail,
  recipientName,
  senderLabel,
  targetLabel,
  invite,
  dashboardUrl,
}) {
  const settings = await getInviteCommunicationSettings();
  if (!settings.inviteEmailNotifications) return false;
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) return false;
  const transport = getTransport();
  if (!transport) return false;

  const from =
    process.env.SMTP_FROM?.trim() ||
    process.env.BOOKING_EMAIL_FROM?.trim() ||
    '"Pronađi Bend" <noreply@pronadjibend.rs>';

  const eventDate = formatDate(invite?.eventDate);
  const subject = `Novi poziv za saradnju — ${senderLabel}`;
  const text = [
    `Zdravo ${recipientName || ''},`,
    '',
    `Primili ste novi poziv za saradnju od: ${senderLabel}.`,
    targetLabel ? `Prima: ${targetLabel}` : null,
    eventDate ? `Termin: ${eventDate}` : null,
    invite?.location ? `Lokacija: ${invite.location}` : null,
    invite?.feeEur != null ? `Honorar: ${invite.feeEur} EUR` : null,
    invite?.message ? `Poruka:\n${invite.message}` : null,
    '',
    `Kontrolna tabla: ${dashboardUrl}`,
  ].filter(Boolean).join('\n');

  const html = `<p>Zdravo${recipientName ? ` ${escapeHtml(recipientName)}` : ''},</p>
<p>Primili ste <strong>novi poziv za saradnju</strong> od: <strong>${escapeHtml(senderLabel)}</strong>.</p>
<ul style="line-height:1.6">
${targetLabel ? `<li><strong>Prima:</strong> ${escapeHtml(targetLabel)}</li>` : ''}
${eventDate ? `<li><strong>Termin:</strong> ${escapeHtml(eventDate)}</li>` : ''}
${invite?.location ? `<li><strong>Lokacija:</strong> ${escapeHtml(invite.location)}</li>` : ''}
${invite?.feeEur != null ? `<li><strong>Honorar:</strong> ${escapeHtml(`${invite.feeEur} EUR`)}</li>` : ''}
</ul>
${invite?.message ? `<p><strong>Poruka:</strong></p><p style="white-space:pre-wrap">${escapeHtml(invite.message)}</p>` : ''}
<p><a href="${escapeHtml(dashboardUrl)}">Otvori kontrolnu tablu</a></p>`;

  await transport.sendMail({ from, to: recipientEmail, subject, text, html });
  return true;
}
