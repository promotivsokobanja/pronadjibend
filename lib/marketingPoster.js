import sharp from 'sharp';
import QRCode from 'qrcode';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const W = 2480;
const H = 3508;

/* ── Font provisioning for serverless (Lambda has no desktop fonts) ── */
const FONT_DIR = join(tmpdir(), 'poster-fonts');
let fontsReady = false;

const FONT_SOURCES = [
  { file: 'DejaVuSans.ttf', url: 'https://cdn.jsdelivr.net/npm/@vintproykt/dejavu-fonts-ttf/ttf/DejaVuSans.ttf' },
  { file: 'DejaVuSans-Bold.ttf', url: 'https://cdn.jsdelivr.net/npm/@vintproykt/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf' },
];

async function ensureFonts() {
  if (fontsReady) return;

  await mkdir(FONT_DIR, { recursive: true });

  const downloads = FONT_SOURCES
    .filter(({ file }) => !existsSync(join(FONT_DIR, file)))
    .map(async ({ file, url }) => {
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`Font fetch failed (${file}): ${res.status}`);
      await writeFile(join(FONT_DIR, file), Buffer.from(await res.arrayBuffer()));
    });

  if (downloads.length) await Promise.all(downloads);

  // fontconfig configuration so librsvg/pango finds our fonts
  const cacheDir = join(FONT_DIR, 'cache');
  await mkdir(cacheDir, { recursive: true });

  const confPath = join(FONT_DIR, 'fonts.conf');
  if (!existsSync(confPath)) {
    await writeFile(confPath, `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <dir>${FONT_DIR}</dir>
  <cachedir>${cacheDir}</cachedir>
</fontconfig>`);
  }

  process.env.FONTCONFIG_FILE = confPath;
  process.env.FONTCONFIG_PATH = FONT_DIR;
  fontsReady = true;
}

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

async function fetchImageAsDataUrl(url) {
  try {
    if (!url) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const resized = await sharp(buf)
      .resize(600, 600, { fit: 'cover' })
      .png()
      .toBuffer();
    return `data:image/png;base64,${resized.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * @param {{ qrUrl: string; bandDisplayName?: string | null; genre?: string | null; location?: string | null; imgUrl?: string | null }} opts
 * @returns {Promise<Buffer>}
 */
export async function renderMarketingPosterPng({ qrUrl, bandDisplayName = null, genre = null, location = null, imgUrl = null }) {
  const bandName = truncate(bandDisplayName || 'Bend', 30);
  const genreText = genre ? truncate(genre, 40) : '';
  const locationText = location ? truncate(location, 40) : '';
  const infoLine = [genreText, locationText].filter(Boolean).join('  •  ');

  const qrSize = 1000;
  const qrX = Math.round((W - qrSize) / 2);
  const qrY = 1900;

  const [qrPng, bandImgDataUrl] = await Promise.all([
    QRCode.toBuffer(qrUrl, {
      type: 'png',
      width: 1100,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#0f172a', light: '#ffffff' },
    }),
    fetchImageAsDataUrl(imgUrl),
  ]);
  const qrDataUrl = `data:image/png;base64,${qrPng.toString('base64')}`;

  await ensureFonts();

  const ff = "DejaVu Sans, Segoe UI, Arial, sans-serif";

  // Band image — large circle avatar
  const imgR = 300;
  const imgCx = W / 2;
  const imgCy = 460;
  const bandImgSvg = bandImgDataUrl
    ? `<defs><clipPath id="avatarClip"><circle cx="${imgCx}" cy="${imgCy}" r="${imgR}"/></clipPath></defs>
       <circle cx="${imgCx}" cy="${imgCy}" r="${imgR + 8}" fill="none" stroke="url(#accentGrad)" stroke-width="6"/>
       <image href="${bandImgDataUrl}" x="${imgCx - imgR}" y="${imgCy - imgR}" width="${imgR * 2}" height="${imgR * 2}" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="${imgCx}" cy="${imgCy}" r="${imgR}" fill="#0c1929" stroke="url(#accentGrad)" stroke-width="6"/>
       <text x="${imgCx}" y="${imgCy + 60}" text-anchor="middle" font-family="${ff}" font-size="240" font-weight="800" fill="#6366f1" opacity="0.5">${esc(bandName.charAt(0).toUpperCase())}</text>`;

  // Band name font size — scale for length
  const nameFontSize = bandName.length > 20 ? 130 : bandName.length > 14 ? 160 : 200;
  const nameY = imgCy + imgR + 140;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bgGrad" x1="0" y1="0" x2="0.3" y2="1">
    <stop offset="0%" stop-color="#020617"/>
    <stop offset="50%" stop-color="#0f172a"/>
    <stop offset="100%" stop-color="#020617"/>
  </linearGradient>
  <radialGradient id="glowTop" cx="50%" cy="5%" r="50%">
    <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.2"/>
    <stop offset="100%" stop-color="#4f46e5" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowBottom" cx="50%" cy="90%" r="45%">
    <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.12"/>
    <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#818cf8"/>
    <stop offset="100%" stop-color="#6366f1"/>
  </linearGradient>
  <linearGradient id="ctaGrad" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#a5b4fc"/>
    <stop offset="100%" stop-color="#818cf8"/>
  </linearGradient>
  <linearGradient id="greenGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#34d399"/>
    <stop offset="100%" stop-color="#10b981"/>
  </linearGradient>
</defs>

<!-- Background -->
<rect width="100%" height="100%" fill="url(#bgGrad)"/>
<rect width="100%" height="100%" fill="url(#glowTop)"/>
<rect width="100%" height="100%" fill="url(#glowBottom)"/>

<!-- Outer border -->
<rect x="50" y="50" width="${W - 100}" height="${H - 100}" fill="none" stroke="url(#accentGrad)" stroke-width="3" opacity="0.2" rx="44"/>

<!-- Band Avatar -->
${bandImgSvg}

<!-- Band Name -->
<text x="${W / 2}" y="${nameY}" text-anchor="middle" font-family="${ff}" font-size="${nameFontSize}" font-weight="800" fill="#ffffff" letter-spacing="3">${esc(bandName)}</text>

<!-- Genre & Location -->
${infoLine ? `<text x="${W / 2}" y="${nameY + 100}" text-anchor="middle" font-family="${ff}" font-size="68" font-weight="600" fill="#a5b4fc">${esc(infoLine)}</text>` : ''}

<!-- Main CTA heading -->
<text x="${W / 2}" y="${nameY + 280}" text-anchor="middle" font-family="${ff}" font-size="160" font-weight="800" fill="url(#ctaGrad)">Naruči pesmu</text>

<!-- Steps card -->
<rect x="180" y="1280" width="2120" height="540" rx="32" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(99, 102, 241, 0.15)" stroke-width="3"/>

<circle cx="360" cy="1420" r="58" fill="#4f46e5"/>
<text x="360" y="1446" text-anchor="middle" font-family="${ff}" font-size="64" font-weight="800" fill="#ffffff">1</text>
<text x="500" y="1408" font-family="${ff}" font-size="72" font-weight="700" fill="#f1f5f9">Skeniraj QR kod</text>
<text x="500" y="1476" font-family="${ff}" font-size="52" fill="#94a3b8">Otvori stranicu za naručivanje pesama</text>

<circle cx="360" cy="1580" r="58" fill="#4f46e5"/>
<text x="360" y="1606" text-anchor="middle" font-family="${ff}" font-size="64" font-weight="800" fill="#ffffff">2</text>
<text x="500" y="1568" font-family="${ff}" font-size="72" font-weight="700" fill="#f1f5f9">Izaberi pesmu</text>
<text x="500" y="1636" font-family="${ff}" font-size="52" fill="#94a3b8">Pronađi željenu numeru u repertoaru</text>

<circle cx="360" cy="1740" r="58" fill="#4f46e5"/>
<text x="360" y="1766" text-anchor="middle" font-family="${ff}" font-size="64" font-weight="800" fill="#ffffff">3</text>
<text x="500" y="1728" font-family="${ff}" font-size="72" font-weight="700" fill="#f1f5f9">Pošalji zahtev</text>
<text x="500" y="1796" font-family="${ff}" font-size="52" fill="#94a3b8">Bend odmah vidi vašu narudžbinu</text>

<!-- QR Code container -->
<rect x="${qrX - 30}" y="${qrY - 30}" width="${qrSize + 60}" height="${qrSize + 60}" rx="28" fill="#ffffff" stroke="url(#accentGrad)" stroke-width="4"/>
<image xlink:href="${qrDataUrl}" href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" preserveAspectRatio="xMidYMid meet"/>

<!-- CTA below QR -->
<text x="${W / 2}" y="${qrY + qrSize + 130}" text-anchor="middle" font-family="${ff}" font-size="88" font-weight="800" fill="url(#greenGrad)">Skeniraj i pošalji zahtev</text>

<!-- Footer -->
<line x1="300" y1="${H - 220}" x2="${W - 300}" y2="${H - 220}" stroke="rgba(99, 102, 241, 0.15)" stroke-width="2"/>
<text x="${W / 2}" y="${H - 120}" text-anchor="middle" font-family="${ff}" font-size="68" font-weight="700" fill="#818cf8">pronadjibend.rs</text>
</svg>`;

  return sharp(Buffer.from(svg, 'utf8'), { density: 300 })
    .png({ compressionLevel: 6, effort: 10 })
    .resize(W, H, { fit: 'fill' })
    .toBuffer();
}
