import sharp from 'sharp';
import QRCode from 'qrcode';

const W = 2480;
const H = 3508;
const qrSize = 1180;
const qrX = Math.round((W - qrSize) / 2);

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(str, max) {
  const t = String(str || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * @param {{ qrUrl: string; bandDisplayName?: string | null }} opts
 * @returns {Promise<Buffer>}
 */
export async function renderMarketingPosterPng({ qrUrl, bandDisplayName = null }) {
  const isBand = Boolean(bandDisplayName && String(bandDisplayName).trim());
  const yOff = isBand ? 58 : 0;
  const ctaLine = isBand
    ? 'SKENIRAJ — LIVE PESMARICA I ZAHTEVI ZA TVOJ STO!'
    : 'SKENIRAJ I REGISTRUJ SE BESPLATNO!';
  const footerLine = isBand ? 'pronadjibend.rs · live link za goste' : 'pronadjibend.rs';

  const qrPng = await QRCode.toBuffer(qrUrl, {
    type: 'png',
    width: 1200,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#0c0e16', light: '#f8f4e8' },
  });
  const qrDataUrl = `data:image/png;base64,${qrPng.toString('base64')}`;
  const qrY = 1180 + yOff;

  const bandLine = isBand
    ? `<text x="${W / 2}" y="438" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="36" font-weight="700" fill="#e8c547">${esc(
        `Za goste: ${truncate(bandDisplayName, 46)}`
      )}</text>`
    : '';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#06070d"/>
    <stop offset="55%" stop-color="#0f1220"/>
    <stop offset="100%" stop-color="#151a2e"/>
  </linearGradient>
  <radialGradient id="vignette" cx="50%" cy="40%" r="75%">
    <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0.45"/>
  </radialGradient>
  <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#fff8dc"/>
    <stop offset="30%" stop-color="#f0d56e"/>
    <stop offset="65%" stop-color="#c9a227"/>
    <stop offset="100%" stop-color="#8a6d1f"/>
  </linearGradient>
  <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#5c4a1a" stop-opacity="0"/>
    <stop offset="20%" stop-color="#d4af37"/>
    <stop offset="80%" stop-color="#d4af37"/>
    <stop offset="100%" stop-color="#5c4a1a" stop-opacity="0"/>
  </linearGradient>
  <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="3" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>

<rect width="100%" height="100%" fill="url(#bgGrad)"/>
<rect width="100%" height="100%" fill="url(#vignette)"/>

<rect x="56" y="56" width="${W - 112}" height="${H - 112}" fill="none" stroke="#b8942e" stroke-width="4" opacity="0.55" rx="6"/>
<rect x="72" y="72" width="${W - 144}" height="${H - 144}" fill="none" stroke="#3d3518" stroke-width="2" opacity="0.9" rx="4"/>

<line x1="200" y1="${420 + yOff}" x2="${W - 200}" y2="${420 + yOff}" stroke="url(#goldLine)" stroke-width="2"/>

<text x="${W / 2}" y="175" text-anchor="middle" font-family="Georgia, 'Times New Roman', Times, serif" font-size="96" font-weight="700" fill="url(#goldGrad)" filter="url(#softGlow)">${esc('MODERNIZUJ SVOJ')}</text>
<text x="${W / 2}" y="295" text-anchor="middle" font-family="Georgia, 'Times New Roman', Times, serif" font-size="96" font-weight="700" fill="url(#goldGrad)" filter="url(#softGlow)">${esc('NASTUP.')}</text>

<text x="${W / 2}" y="385" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="44" fill="#d8c89a" opacity="0.95">${esc('Pronađi Bend – Tvoj digitalni asistent na bini.')}</text>
${bandLine}

<g transform="translate(120, ${455 + yOff})">
  <rect x="0" y="0" width="108" height="108" rx="14" fill="none" stroke="#c9a227" stroke-width="3" opacity="0.85"/>
  <path d="M34 88V28l40-8v60" fill="none" stroke="#e8c547" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <ellipse cx="54" cy="78" rx="10" ry="8" fill="none" stroke="#e8c547" stroke-width="4"/>
  <rect x="62" y="36" width="28" height="22" rx="3" fill="none" stroke="#f0d56e" stroke-width="3"/>
  <path d="M66 44h18 M66 50h14" stroke="#f0d56e" stroke-width="2.5" stroke-linecap="round"/>
</g>
<text x="260" y="${495 + yOff}" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="38" font-weight="700" fill="url(#goldGrad)">${esc('DIGITALNA PESMARICA:')}</text>
<text x="260" y="${545 + yOff}" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="30" fill="#c8c2b0">${esc('Gosti skeniraju kod, prelistaju repertoar i naručuju pesmu za 5s.')}</text>

<g transform="translate(120, ${615 + yOff})">
  <rect x="0" y="0" width="108" height="108" rx="14" fill="none" stroke="#c9a227" stroke-width="3" opacity="0.85"/>
  <path d="M54 28c-14 0-24 10-24 24v26h48V52c0-14-10-24-24-24z" fill="none" stroke="#e8c547" stroke-width="4" stroke-linejoin="round"/>
  <path d="M42 52h24 M42 64h18" stroke="#e8c547" stroke-width="3" stroke-linecap="round"/>
  <path d="M78 22v-8h10v8" fill="none" stroke="#f0d56e" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="84" cy="18" r="5" fill="none" stroke="#f0d56e" stroke-width="3"/>
</g>
<text x="260" y="${655 + yOff}" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="38" font-weight="700" fill="url(#goldGrad)">${esc('LIVE DASHBOARD:')}</text>
<text x="260" y="${705 + yOff}" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="30" fill="#c8c2b0">${esc('Zvučna notifikacija na tvom tabletu/telefonu čim stigne narudžbina.')}</text>

<g transform="translate(120, ${775 + yOff})">
  <rect x="0" y="0" width="108" height="108" rx="14" fill="none" stroke="#c9a227" stroke-width="3" opacity="0.85"/>
  <circle cx="40" cy="72" r="14" fill="none" stroke="#e8c547" stroke-width="4"/>
  <circle cx="68" cy="72" r="14" fill="none" stroke="#e8c547" stroke-width="4"/>
  <circle cx="54" cy="48" r="18" fill="none" stroke="#f0d56e" stroke-width="4"/>
  <path d="M54 30v10" stroke="#f0d56e" stroke-width="3" stroke-linecap="round"/>
</g>
<text x="260" y="${815 + yOff}" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="url(#goldGrad)">${esc('VIŠE BAKŠIŠA PREKO KONOBARA:')}</text>
<text x="260" y="${860 + yOff}" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="28" fill="#c8c2b0">${esc("Gost preko sajta 'nudi' bakšiš. Konobar prosleđuje novac bendu.")}</text>

<rect x="${qrX - 24}" y="${qrY - 24}" width="${qrSize + 48}" height="${qrSize + 48}" rx="20" fill="#0a0c14" stroke="#c9a227" stroke-width="4" opacity="0.95"/>
<image xlink:href="${qrDataUrl}" href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" preserveAspectRatio="xMidYMid meet"/>

<text x="${W / 2}" y="${qrY + qrSize + 110}" text-anchor="middle" font-family="Georgia, 'Times New Roman', Times, serif" font-size="${isBand ? 46 : 52}" font-weight="700" fill="url(#goldGrad)">${esc(ctaLine)}</text>

<text x="${W / 2}" y="${H - 160}" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="40" font-weight="600" fill="#e8c547" letter-spacing="1">${esc(footerLine)}</text>

<line x1="200" y1="${H - 210}" x2="${W - 200}" y2="${H - 210}" stroke="url(#goldLine)" stroke-width="2"/>
</svg>`;

  return sharp(Buffer.from(svg, 'utf8'), { density: 300 })
    .png({ compressionLevel: 6, effort: 10 })
    .resize(W, H, { fit: 'fill' })
    .toBuffer();
}
