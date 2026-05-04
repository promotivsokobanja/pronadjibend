/**
 * Email servis za PronadjiBend
 * Koristi Nodemailer za slanje email-ova (računi, podsetnici, nudge).
 *
 * Potrebne ENV varijable:
 *   SMTP_HOST      - SMTP server (npr. smtp.gmail.com)
 *   SMTP_PORT      - Port (npr. 587)
 *   SMTP_USER      - Email za autentifikaciju
 *   SMTP_PASS      - Lozinka / app password
 *   EMAIL_FROM     - Pošiljalac (npr. "PronadjiBend <noreply@pronadjibend.rs>")
 */

import nodemailer from 'nodemailer';

// ── Transporter (lazy init) ──────────────────────────────────

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[email] SMTP konfiguracija nedostaje (SMTP_HOST, SMTP_USER, SMTP_PASS).');
    return null;
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return _transporter;
}

const FROM = process.env.EMAIL_FROM || 'PronadjiBend <noreply@pronadjibend.rs>';

// ── Slanje računa ────────────────────────────────────────────

/**
 * Šalje PDF račun na email korisnika.
 *
 * @param {Object} params
 * @param {string} params.to            - Email primaoca
 * @param {Buffer} params.pdfBuffer     - PDF fajl kao buffer
 * @param {string} params.invoiceNumber - Broj računa
 * @param {string} params.plan          - "PREMIUM" ili "PREMIUM_VENUE"
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function sendInvoiceEmail({ to, pdfBuffer, invoiceNumber, plan }) {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP nije konfigurisan.' };
    }

    const planLabel = plan === 'PREMIUM_VENUE' ? 'Premium Venue' : 'Premium';

    await transporter.sendMail({
      from: FROM,
      to,
      subject: `PronadjiBend — Račun ${invoiceNumber} (${planLabel})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Hvala na uplati! 🎶</h2>
          <p style="color: #475569; line-height: 1.6;">
            Vaša <strong>${planLabel}</strong> pretplata na PronadjiBend.rs je aktivirana.
            U prilogu se nalazi račun br. <strong>${invoiceNumber}</strong>.
          </p>
          <p style="color: #475569; line-height: 1.6;">
            Pretplata važi 30 dana od datuma potvrde uplate.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">
            PronadjiBend.rs — platforma za pronalaženje muzičkih izvođača
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `racun-${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return { success: true };
  } catch (error) {
    console.error('[email] sendInvoiceEmail error:', error);
    return { success: false, error: error.message };
  }
}

// ── Podsetnik za obnovu pretplate ────────────────────────────

/**
 * Šalje email podsetnik 7 dana pre isteka pretplate.
 *
 * @param {Object} params
 * @param {string} params.to          - Email primaoca
 * @param {string} params.userName    - Ime korisnika ili benda
 * @param {string} params.plan        - Trenutni plan
 * @param {Date}   params.expiresAt   - Datum isteka
 * @param {string} [params.qrDataUrl] - Base64 QR slika za obnovu (opciono)
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function sendRenewalReminder({ to, userName, plan, expiresAt, qrDataUrl }) {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP nije konfigurisan.' };
    }

    const planLabel = plan === 'PREMIUM_VENUE' ? 'Premium Venue' : 'Premium';
    const expiryDate = new Date(expiresAt).toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const qrSection = qrDataUrl
      ? `
        <div style="margin: 24px 0; text-align: center;">
          <p style="color: #475569; font-size: 14px;">Skenirajte QR kod za obnovu pretplate:</p>
          <img src="${qrDataUrl}" alt="IPS QR kod" width="250" height="250" style="border: 1px solid #e2e8f0; border-radius: 8px;" />
        </div>
      `
      : '';

    await transporter.sendMail({
      from: FROM,
      to,
      subject: `PronadjiBend — Vaša ${planLabel} pretplata ističe ${expiryDate}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Vaša pretplata uskoro ističe</h2>
          <p style="color: #475569; line-height: 1.6;">
            Zdravo${userName ? ` ${userName}` : ''},
          </p>
          <p style="color: #475569; line-height: 1.6;">
            Vaša <strong>${planLabel}</strong> pretplata na PronadjiBend.rs ističe
            <strong>${expiryDate}</strong>. Da biste nastavili da koristite sve pogodnosti,
            obnovite pretplatu na vreme.
          </p>
          ${qrSection}
          <p style="color: #475569; line-height: 1.6;">
            Možete obnoviti pretplatu i na sajtu: 
            <a href="https://pronadjibend.rs/upgrade" style="color: #3b82f6;">pronadjibend.rs/upgrade</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">
            PronadjiBend.rs — platforma za pronalaženje muzičkih izvođača
          </p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('[email] sendRenewalReminder error:', error);
    return { success: false, error: error.message };
  }
}

// ── Nudge email za Free korisnike ────────────────────────────

/**
 * Šalje podsticajni email korisnicima sa nepopunjenim profilom.
 *
 * @param {Object} params
 * @param {string} params.to            - Email primaoca
 * @param {string} params.userName      - Ime korisnika ili benda
 * @param {number} params.profilePercent - Procenat popunjenosti profila
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function sendNudgeEmail({ to, userName, profilePercent }) {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP nije konfigurisan.' };
    }

    const pct = Math.round(profilePercent);

    await transporter.sendMail({
      from: FROM,
      to,
      subject: 'PronadjiBend — Popunite profil i privucite više klijenata!',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Vaš profil je ${pct}% popunjen</h2>
          <p style="color: #475569; line-height: 1.6;">
            Zdravo${userName ? ` ${userName}` : ''},
          </p>
          <p style="color: #475569; line-height: 1.6;">
            Bendovi i klijenti sa potpunim profilom dobijaju do <strong>3x više upita</strong>.
            Dodajte još informacija da se istaknete:
          </p>
          <ul style="color: #475569; line-height: 1.8;">
            <li>Kvalitetna profilna slika</li>
            <li>Detaljan opis (bio)</li>
            <li>Video snimak nastupa</li>
            <li>Repertoar sa pesmama</li>
          </ul>
          <p style="margin-top: 20px;">
            <a href="https://pronadjibend.rs/bands"
               style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Dopunite profil
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">
            PronadjiBend.rs — platforma za pronalaženje muzičkih izvođača
          </p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('[email] sendNudgeEmail error:', error);
    return { success: false, error: error.message };
  }
}
