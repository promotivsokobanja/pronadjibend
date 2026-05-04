/**
 * PDF Invoice Generator
 * Generiše PDF račun za PronadjiBend pretplate koristeći jsPDF.
 *
 * Firma: ProMotiv
 * PIB:   108191504
 * MB:    63280801
 * Račun: 325-9500700031761-69 (OTP Bank)
 */

import { jsPDF } from 'jspdf';
import { getFirmData } from './ipsQr';

// ── Konstante ─────────────────────────────────────────────────
const FIRM = getFirmData();
const FIRM_FULL = {
  ...FIRM,
  fullName: 'ProMotiv',
  pibFormatted: '108 191 504',
  mbFormatted: '63 280 801',
  bankName: 'OTP Banka',
  accountFormatted: '325-9500700031761-69',
  address: 'Srbija', // Dopuniti kada bude poznato
};

const PLAN_LABELS = {
  PREMIUM: 'Premium godišnja pretplata',
  PREMIUM_VENUE: 'Premium Venue godišnja pretplata',
};

// ── Pomoćne funkcije ─────────────────────────────────────────

function formatDateSr(date) {
  const d = new Date(date);
  return d.toLocaleDateString('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatAmountRsd(amount) {
  return Number(amount)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ── Glavna funkcija ──────────────────────────────────────────

/**
 * Generiše PDF račun i vraća ga kao Buffer.
 *
 * @param {Object} params
 * @param {string} params.invoiceNumber   - Broj računa (npr. "2026-0001")
 * @param {string} params.plan            - "PREMIUM" ili "PREMIUM_VENUE"
 * @param {number} params.amountRsd       - Iznos u RSD
 * @param {number} params.amountEur       - Iznos u EUR
 * @param {number} params.eurToRsdRate    - Kurs
 * @param {string} params.referenceId     - Poziv na broj
 * @param {string} params.userEmail       - Email korisnika
 * @param {Object} [params.billingData]   - { companyName, pib, mb, address }
 * @param {Date}   [params.date]          - Datum računa (default: now)
 * @param {Date}   [params.planUntil]     - Datum isteka pretplate
 * @returns {Buffer} PDF fajl kao buffer
 */
export function generateInvoicePdf({
  invoiceNumber,
  plan,
  amountRsd,
  amountEur,
  eurToRsdRate,
  referenceId,
  userEmail,
  billingData,
  date,
  planUntil,
}) {
  // jsPDF: A4 portrait, mm units
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 20;

  // ── Helper za tekst ──
  const text = (str, x, yPos, opts = {}) => {
    doc.text(str, x, yPos, opts);
  };

  const line = (y1) => {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(marginL, y1, pageW - marginR, y1);
  };

  // ── Zaglavlje: firma ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  text('PronadjiBend.rs', marginL, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  text(`${FIRM_FULL.fullName}  |  PIB: ${FIRM_FULL.pibFormatted}  |  MB: ${FIRM_FULL.mbFormatted}`, marginL, y);
  y += 5;
  text(`Racun: ${FIRM_FULL.accountFormatted}  |  ${FIRM_FULL.bankName}`, marginL, y);
  y += 8;

  line(y);
  y += 8;

  // ── Naslov: RACUN ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  text(`RACUN br. ${invoiceNumber || '—'}`, marginL, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  text(`Datum izdavanja: ${formatDateSr(date || new Date())}`, marginL, y);
  y += 5;
  text(`Poziv na broj: ${referenceId || '—'}`, marginL, y);
  y += 10;

  // ── Kupac ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  text('KUPAC:', marginL, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  if (billingData?.companyName) {
    text(billingData.companyName, marginL, y);
    y += 5;
  }
  text(`Email: ${userEmail}`, marginL, y);
  y += 5;
  if (billingData?.pib) {
    text(`PIB: ${billingData.pib}`, marginL, y);
    y += 5;
  }
  if (billingData?.mb) {
    text(`MB: ${billingData.mb}`, marginL, y);
    y += 5;
  }
  if (billingData?.address) {
    text(`Adresa: ${billingData.address}`, marginL, y);
    y += 5;
  }
  y += 5;

  line(y);
  y += 8;

  // ── Tabela stavki ──
  const colX = [marginL, marginL + 10, marginL + 110, marginL + 140];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  text('R.br.', colX[0], y);
  text('Opis usluge', colX[1], y);
  text('Kol.', colX[2], y);
  text('Iznos (RSD)', colX[3], y);
  y += 3;
  line(y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  text('1.', colX[0], y);
  text(PLAN_LABELS[plan] || 'Pretplata', colX[1], y);
  text('1', colX[2], y);
  doc.setFont('helvetica', 'bold');
  text(`${formatAmountRsd(amountRsd)} RSD`, colX[3], y);
  y += 3;
  line(y);
  y += 8;

  // ── Ukupno ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  text(`UKUPNO: ${formatAmountRsd(amountRsd)} RSD`, pageW - marginR, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  text(
    `(${amountEur} EUR x ${eurToRsdRate} RSD/EUR)`,
    pageW - marginR,
    y,
    { align: 'right' }
  );
  y += 10;

  // ── Period pretplate ──
  if (planUntil) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    text(`Pretplata vazi do: ${formatDateSr(planUntil)}`, marginL, y);
    y += 10;
  }

  // ── Footer ──
  line(y);
  y += 6;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  text('Ovaj racun je generisan elektronski i vazi bez pecata i potpisa.', marginL, y);
  y += 4;
  text('PronadjiBend.rs — platforma za pronalazenje muzickih izvodjaca', marginL, y);

  // ── Vrati kao Buffer ──
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

/**
 * Generiše sledeći broj računa na osnovu ukupnog broja potvrđenih uplata.
 *
 * @param {number} confirmedCount - Trenutni broj potvrđenih uplata
 * @returns {string} Format: "YYYY-NNNN" (npr. "2026-0001")
 */
export function generateInvoiceNumber(confirmedCount) {
  const year = new Date().getFullYear();
  const seq = String((confirmedCount || 0) + 1).padStart(4, '0');
  return `${year}-${seq}`;
}
