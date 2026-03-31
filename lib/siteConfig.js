import prisma from './prisma';

const DEFAULT_BAND_PROFILE_MEDIA_LIMITS = {
  maxImages: 1,
  maxVideos: 1,
  maxLinks: 5,
};

function normalizeLimit(value, fallback, maxValue) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const floored = Math.floor(parsed);
  if (floored < 0) return 0;
  if (floored > maxValue) return maxValue;
  return floored;
}

function envForcesDemoOff() {
  const v = process.env.SHOW_DEMO_BANDS;
  if (v === undefined || v === '') return false;
  return ['0', 'false', 'no', 'off'].includes(String(v).toLowerCase().trim());
}

function envForcesDemoOn() {
  const v = process.env.SHOW_DEMO_BANDS;
  if (v === undefined || v === '') return false;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase().trim());
}

/** Da li javni API i početna uključuju demo bendove (osim ako .env eksplicitno ne isključi). */
export async function getShowDemoBands() {
  if (envForcesDemoOff()) return false;
  if (envForcesDemoOn()) return true;
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    if (row) return row.showDemoBands;
  } catch {
    /* tabela možda još nije migrirana */
  }
  return true;
}

export function getDemoBandsEnvOverrideHint() {
  const v = process.env.SHOW_DEMO_BANDS;
  if (v === undefined || v === '') return null;
  return String(v).trim();
}

export async function setShowDemoBands(value) {
  await prisma.siteConfig.upsert({
    where: { id: 1 },
    create: { id: 1, showDemoBands: Boolean(value) },
    update: { showDemoBands: Boolean(value) },
  });
}

export async function getBandProfileMediaLimits() {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    return {
      maxImages: normalizeLimit(row?.bandProfileMaxImages, DEFAULT_BAND_PROFILE_MEDIA_LIMITS.maxImages, 1),
      maxVideos: normalizeLimit(row?.bandProfileMaxVideos, DEFAULT_BAND_PROFILE_MEDIA_LIMITS.maxVideos, 1),
      maxLinks: normalizeLimit(row?.bandProfileMaxLinks, DEFAULT_BAND_PROFILE_MEDIA_LIMITS.maxLinks, 30),
    };
  } catch {
    return { ...DEFAULT_BAND_PROFILE_MEDIA_LIMITS };
  }
}

export async function setBandProfileMediaLimits(limits) {
  const normalized = {
    maxImages: normalizeLimit(limits?.maxImages, DEFAULT_BAND_PROFILE_MEDIA_LIMITS.maxImages, 1),
    maxVideos: normalizeLimit(limits?.maxVideos, DEFAULT_BAND_PROFILE_MEDIA_LIMITS.maxVideos, 1),
    maxLinks: normalizeLimit(limits?.maxLinks, DEFAULT_BAND_PROFILE_MEDIA_LIMITS.maxLinks, 30),
  };

  await prisma.siteConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      showDemoBands: true,
      bandProfileMaxImages: normalized.maxImages,
      bandProfileMaxVideos: normalized.maxVideos,
      bandProfileMaxLinks: normalized.maxLinks,
    },
    update: {
      bandProfileMaxImages: normalized.maxImages,
      bandProfileMaxVideos: normalized.maxVideos,
      bandProfileMaxLinks: normalized.maxLinks,
    },
  });

  return normalized;
}
