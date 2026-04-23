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
      .resize(400, 400, { fit: 'cover' })
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
  const genreText = genre ? truncate(genre, 40) : 'Žanr nije dodat';
  const locationText = location ? truncate(location, 40) : 'Lokacija nije dodata';
  const infoLine = [genreText, locationText].join('  •  ');

  const qrSize = 900;
  const qrX = Math.round((W - qrSize) / 2);
  const qrY = 1920;

  const [qrPng, bandImgDataUrl] = await Promise.all([
    QRCode.toBuffer(qrUrl, {
      type: 'png',
      width: 1000,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#0c0e16', light: '#f8f4e8' },
    }),
    fetchImageAsDataUrl(imgUrl),
  ]);
  const qrDataUrl = `data:image/png;base64,${qrPng.toString('base64')}`;

  // Install fonts to disk + configure fontconfig (needed on Lambda)
  await ensureFonts();

  const ff = "DejaVu Sans, Segoe UI, Arial, sans-serif";

  // Band image section
  const imgR = 180;
  const imgCx = W / 2;
  const imgCy = 340;
  const bandImgSvg = bandImgDataUrl
    ? `<defs><clipPath id="avatarClip"><circle cx="${imgCx}" cy="${imgCy}" r="${imgR}"/></clipPath></defs>
       <circle cx="${imgCx}" cy="${imgCy}" r="${imgR + 6}" fill="none" stroke="url(#accentGrad)" stroke-width="5"/>
       <image href="${bandImgDataUrl}" x="${imgCx - imgR}" y="${imgCy - imgR}" width="${imgR * 2}" height="${imgR * 2}" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>` 
    : `<circle cx="${imgCx}" cy="${imgCy}" r="${imgR}" fill="#1e293b" stroke="url(#accentGrad)" stroke-width="5"/>
       <text x="${imgCx}" y="${imgCy + 40}" text-anchor="middle" font-family="${ff}" font-size="160" font-weight="800" fill="#38bdf8">${esc(bandName.charAt(0).toUpperCase())}</text>`;

  // Band name font size — scale down for long names
  const nameFontSize = bandName.length > 20 ? 110 : bandName.length > 14 ? 130 : 160;
  const nameY = imgCy + imgR + 120;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#030712"/>
    <stop offset="52%" stop-color="#0f172a"/>
    <stop offset="100%" stop-color="#111827"/>
  </linearGradient>
  <radialGradient id="glowTop" cx="50%" cy="10%" r="60%">
    <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.22"/>
    <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowBottom" cx="50%" cy="92%" r="45%">
    <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.18"/>
    <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#38bdf8"/>
    <stop offset="100%" stop-color="#0ea5e9"/>
  </linearGradient>
  <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#fbbf24"/>
    <stop offset="100%" stop-color="#f59e0b"/>
  </linearGradient>
</defs>

<!-- Background -->
<rect width="100%" height="100%" fill="url(#bgGrad)"/>
<rect width="100%" height="100%" fill="url(#glowTop)"/>
<rect width="100%" height="100%" fill="url(#glowBottom)"/>

<!-- Border -->
<rect x="60" y="60" width="${W - 120}" height="${H - 120}" fill="none" stroke="#38bdf8" stroke-width="3" opacity="0.25" rx="32"/>

<!-- Band Avatar -->
${bandImgSvg}

<!-- Band Name -->
<text x="${W / 2}" y="${nameY}" text-anchor="middle" font-family="${ff}" font-size="${nameFontSize}" font-weight="800" fill="#f8fafc" letter-spacing="4">${esc(bandName)}</text>

<!-- Genre & Location -->
<text x="${W / 2}" y="${nameY + 80}" text-anchor="middle" font-family="${ff}" font-size="56" font-weight="600" fill="#7dd3fc">${esc(infoLine)}</text>

<!-- Divider -->
<line x1="400" y1="${nameY + 140}" x2="${W - 400}" y2="${nameY + 140}" stroke="#1e3a5f" stroke-width="2"/>

<!-- Heading -->
<text x="${W / 2}" y="${nameY + 300}" text-anchor="middle" font-family="${ff}" font-size="140" font-weight="800" fill="url(#accentGrad)">Naruči pesmu</text>

<!-- Steps card -->
<rect x="220" y="1280" width="2040" height="540" rx="32" fill="rgba(11, 19, 40, 0.72)" stroke="#334155" stroke-width="2"/>

<circle cx="380" cy="1420" r="58" fill="#0ea5e9"/>
<text x="380" y="1445" text-anchor="middle" font-family="${ff}" font-size="64" font-weight="800" fill="#ffffff">1</text>
<text x="500" y="1410" font-family="${ff}" font-size="62" font-weight="700" fill="#e2e8f0">Skeniraj QR kod</text>
<text x="500" y="1478" font-family="${ff}" font-size="44" fill="#94a3b8">Otvori stranicu za naručivanje pesama</text>

<circle cx="380" cy="1580" r="58" fill="#0ea5e9"/>
<text x="380" y="1605" text-anchor="middle" font-family="${ff}" font-size="64" font-weight="800" fill="#ffffff">2</text>
<text x="500" y="1570" font-family="${ff}" font-size="62" font-weight="700" fill="#e2e8f0">Izaberi pesmu</text>
<text x="500" y="1638" font-family="${ff}" font-size="44" fill="#94a3b8">Pronađi željenu numeru u repertoaru</text>

<circle cx="380" cy="1740" r="58" fill="#0ea5e9"/>
<text x="380" y="1765" text-anchor="middle" font-family="${ff}" font-size="64" font-weight="800" fill="#ffffff">3</text>
<text x="500" y="1730" font-family="${ff}" font-size="62" font-weight="700" fill="#e2e8f0">Pošalji zahtev</text>
<text x="500" y="1798" font-family="${ff}" font-size="44" fill="#94a3b8">Bend odmah vidi vašu narudžbinu</text>

<!-- QR Code -->
<rect x="${qrX - 20}" y="${qrY - 20}" width="${qrSize + 40}" height="${qrSize + 40}" rx="20" fill="rgba(10, 12, 20, 0.95)" stroke="url(#goldGrad)" stroke-width="4"/>
<image xlink:href="${qrDataUrl}" href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" preserveAspectRatio="xMidYMid meet"/>

<!-- CTA -->
<text x="${W / 2}" y="${qrY + qrSize + 110}" text-anchor="middle" font-family="${ff}" font-size="72" font-weight="800" fill="url(#accentGrad)">Skeniraj i pošalji zahtev</text>

<!-- Footer divider -->
<line x1="200" y1="${H - 260}" x2="${W - 200}" y2="${H - 260}" stroke="#1e3a5f" stroke-width="2"/>

<!-- Footer -->
<text x="${W / 2}" y="${H - 160}" text-anchor="middle" font-family="${ff}" font-size="56" font-weight="600" fill="#38bdf8">pronadjibend.rs</text>
</svg>`;

  return sharp(Buffer.from(svg, 'utf8'), { density: 300 })
    .png({ compressionLevel: 6, effort: 10 })
    .resize(W, H, { fit: 'fill' })
    .toBuffer();
}
