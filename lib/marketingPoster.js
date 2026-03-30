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
  const headingLine = 'Naruci pesmu';
  const headingLine2 = 'za svoj sto';
  const subtitleLine = 'Skenirajte QR kod i posaljite muzicku zelju bendu za par sekundi.';
  const bandLine = isBand
    ? `Veceras svira: ${truncate(bandDisplayName, 44)}`
    : 'Live narucivanje pesama za goste restorana';
  const ctaLine = 'Skeniraj i posalji zahtev';
  const footerLine = 'pronadjibend.rs';

  const qrPng = await QRCode.toBuffer(qrUrl, {
    type: 'png',
    width: 1200,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#0c0e16', light: '#f8f4e8' },
  });
  const qrDataUrl = `data:image/png;base64,${qrPng.toString('base64')}`;
  const qrY = 1260;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#030712"/>
    <stop offset="52%" stop-color="#0f172a"/>
    <stop offset="100%" stop-color="#111827"/>
  </linearGradient>
  <radialGradient id="glowTop" cx="20%" cy="16%" r="55%">
    <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.28"/>
    <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowBottom" cx="80%" cy="88%" r="50%">
    <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.22"/>
    <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#38bdf8"/>
    <stop offset="100%" stop-color="#0ea5e9"/>
  </linearGradient>
</defs>

<rect width="100%" height="100%" fill="url(#bgGrad)"/>
<rect width="100%" height="100%" fill="url(#glowTop)"/>
<rect width="100%" height="100%" fill="url(#glowBottom)"/>

<rect x="64" y="64" width="${W - 128}" height="${H - 128}" fill="none" stroke="#38bdf8" stroke-width="3" opacity="0.32" rx="28"/>
<rect x="92" y="92" width="${W - 184}" height="${H - 184}" fill="none" stroke="#1e293b" stroke-width="2" opacity="0.9" rx="24"/>

<text x="${W / 2}" y="230" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="160" font-weight="800" fill="#f8fafc">${esc(headingLine)}</text>
<text x="${W / 2}" y="390" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="160" font-weight="800" fill="url(#accentGrad)">${esc(headingLine2)}</text>

<text x="${W / 2}" y="530" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="62" font-weight="600" fill="#cbd5e1">${esc(subtitleLine)}</text>
<text x="${W / 2}" y="630" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="56" font-weight="700" fill="#7dd3fc">${esc(bandLine)}</text>

<rect x="220" y="920" width="2040" height="620" rx="36" fill="rgba(11, 19, 40, 0.72)" stroke="#334155" stroke-width="2"/>

<circle cx="380" cy="1080" r="70" fill="#0ea5e9"/>
<text x="380" y="1110" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="76" font-weight="800" fill="#ffffff">1</text>
<text x="500" y="1070" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="72" font-weight="700" fill="#e2e8f0">Skeniraj QR kod</text>
<text x="500" y="1150" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="50" fill="#94a3b8">Otvori stranicu za narucivanje pesama.</text>

<circle cx="380" cy="1260" r="70" fill="#0ea5e9"/>
<text x="380" y="1290" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="76" font-weight="800" fill="#ffffff">2</text>
<text x="500" y="1250" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="72" font-weight="700" fill="#e2e8f0">Izaberi pesmu</text>
<text x="500" y="1330" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="50" fill="#94a3b8">Pronadji zeljenu numeru u live pesmarici.</text>

<circle cx="380" cy="1440" r="70" fill="#0ea5e9"/>
<text x="380" y="1470" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="76" font-weight="800" fill="#ffffff">3</text>
<text x="500" y="1430" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="72" font-weight="700" fill="#e2e8f0">Posalji zahtev bendu</text>
<text x="500" y="1510" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="50" fill="#94a3b8">Bend odmah vidi vasu narudzbinu.</text>

<rect x="${qrX - 24}" y="${qrY + 300}" width="${qrSize + 48}" height="${qrSize + 48}" rx="20" fill="rgba(10, 12, 20, 0.95)" stroke="#c9a227" stroke-width="4"/>
<image xlink:href="${qrDataUrl}" href="${qrDataUrl}" x="${qrX}" y="${qrY + 300}" width="${qrSize}" height="${qrSize}" preserveAspectRatio="xMidYMid meet"/>

<text x="${W / 2}" y="${qrY + qrSize + 460}" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="82" font-weight="800" fill="url(#accentGrad)">${esc(ctaLine)}</text>

<text x="${W / 2}" y="${H - 200}" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="60" font-weight="600" fill="#38bdf8">${esc(footerLine)}</text>

<line x1="200" y1="${H - 280}" x2="${W - 200}" y2="${H - 280}" stroke="#1e3a5f" stroke-width="2"/>
</svg>`;

  return sharp(Buffer.from(svg, 'utf8'), { density: 300 })
    .png({ compressionLevel: 6, effort: 10 })
    .resize(W, H, { fit: 'fill' })
    .toBuffer();
}
