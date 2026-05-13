import prisma from './prisma';

const DEFAULT_INVITE_COMMUNICATION = {
  inviteMaxActiveBasic: 5,
  inviteMaxActivePremium: 20,
  inviteExpireDays: 14,
  inviteCleanupDays: 180,
  inviteEmailNotifications: true,
};

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

/** Da li je sajt u maintenance modu (Under Construction). */
export async function getMaintenanceMode() {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    if (row) return row.maintenanceMode;
  } catch {
    /* tabela možda još nije migrirana */
  }
  return false;
}

export async function setMaintenanceMode(value) {
  await prisma.siteConfig.upsert({
    where: { id: 1 },
    create: { id: 1, maintenanceMode: Boolean(value) },
    update: { maintenanceMode: Boolean(value) },
  });
}

function normalizeKorgPaItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => {
      const name = String(item?.name || '').trim();
      const url = String(item?.url || '').trim();
      if (!name || !url) return null;
      return {
        id: String(item?.id || `korg-${index + 1}`),
        name,
        url,
      };
    })
    .filter(Boolean);
}

export async function getKorgPaItems() {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    const raw = String(row?.korgPaItemsJson || '').trim();
    if (raw) {
      const parsed = JSON.parse(raw);
      const normalized = normalizeKorgPaItems(parsed);
      if (normalized.length) return normalized;
    }
    const legacyUrl = String(row?.korgPaDriveUrl || '').trim();
    if (legacyUrl) {
      return [{ id: 'korg-legacy', name: 'Korg PA setovi', url: legacyUrl }];
    }
  } catch {
    return [];
  }
  return [];
}

export async function setKorgPaItems(items) {
  const normalized = normalizeKorgPaItems(items);
  await prisma.siteConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      korgPaItemsJson: normalized.length ? JSON.stringify(normalized) : null,
      korgPaDriveUrl: normalized[0]?.url || null,
    },
    update: {
      korgPaItemsJson: normalized.length ? JSON.stringify(normalized) : null,
      korgPaDriveUrl: normalized[0]?.url || null,
    },
  });
}

export async function getKorgPaDriveUrl() {
  const items = await getKorgPaItems();
  return items[0]?.url || '';
}

export async function setKorgPaDriveUrl(value) {
  const normalized = String(value || '').trim();
  await setKorgPaItems(normalized ? [{ id: 'korg-legacy', name: 'Korg PA setovi', url: normalized }] : []);
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

export async function getBandProfileLimits() {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    return {
      maxImages: row?.bandProfileMaxImages ?? 5,
      maxVideos: row?.bandProfileMaxVideos ?? 3,
      maxLinks: row?.bandProfileMaxLinks ?? 5,
    };
  } catch {
    return { maxImages: 5, maxVideos: 3, maxLinks: 5 };
  }
}

export async function setBandProfileLimits({ maxImages, maxVideos, maxLinks }) {
  const clamp = (v, min, max) => Math.min(Math.max(Math.floor(Number(v) || min), min), max);
  const data = {
    bandProfileMaxImages: clamp(maxImages, 1, 20),
    bandProfileMaxVideos: clamp(maxVideos, 0, 10),
    bandProfileMaxLinks: clamp(maxLinks, 0, 10),
  };
  await prisma.siteConfig.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  return data;
}

export async function getInviteCommunicationSettings() {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    const raw = String(row?.inviteCommunicationJson || '').trim();
    if (!raw) return { ...DEFAULT_INVITE_COMMUNICATION };
    const parsed = JSON.parse(raw);
    return {
      inviteMaxActiveBasic: Math.min(Math.max(Math.floor(Number(parsed?.inviteMaxActiveBasic) || 5), 1), 100),
      inviteMaxActivePremium: Math.min(Math.max(Math.floor(Number(parsed?.inviteMaxActivePremium) || 20), 1), 500),
      inviteExpireDays: Math.min(Math.max(Math.floor(Number(parsed?.inviteExpireDays) || 14), 1), 365),
      inviteCleanupDays: Math.min(Math.max(Math.floor(Number(parsed?.inviteCleanupDays) || 180), 7), 3650),
      inviteEmailNotifications: typeof parsed?.inviteEmailNotifications === 'boolean'
        ? parsed.inviteEmailNotifications
        : true,
    };
  } catch {
    return { ...DEFAULT_INVITE_COMMUNICATION };
  }
}

export async function setInviteCommunicationSettings(settings) {
  const normalized = {
    inviteMaxActiveBasic: Math.min(Math.max(Math.floor(Number(settings?.inviteMaxActiveBasic) || 5), 1), 100),
    inviteMaxActivePremium: Math.min(Math.max(Math.floor(Number(settings?.inviteMaxActivePremium) || 20), 1), 500),
    inviteExpireDays: Math.min(Math.max(Math.floor(Number(settings?.inviteExpireDays) || 14), 1), 365),
    inviteCleanupDays: Math.min(Math.max(Math.floor(Number(settings?.inviteCleanupDays) || 180), 7), 3650),
    inviteEmailNotifications: typeof settings?.inviteEmailNotifications === 'boolean'
      ? settings.inviteEmailNotifications
      : true,
  };
  await prisma.siteConfig.upsert({
    where: { id: 1 },
    create: { id: 1, inviteCommunicationJson: JSON.stringify(normalized) },
    update: { inviteCommunicationJson: JSON.stringify(normalized) },
  });
  return normalized;
}

const DEFAULT_CONTACT_INFO = {
  email: 'office@pronadjibend.com',
  phone: '+381 64 339 2339',
  location: 'Sokobanja, Srbija',
  instagram: 'https://instagram.com/pronadjiband',
  facebook: '',
};

export async function getContactInfo() {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    const raw = String(row?.contactInfoJson || '').trim();
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged = { ...DEFAULT_CONTACT_INFO };
      for (const key of Object.keys(merged)) {
        if (parsed[key] && String(parsed[key]).trim()) {
          merged[key] = String(parsed[key]).trim();
        }
      }
      return merged;
    }
  } catch {
    /* DB not yet migrated or parse error — return defaults */
  }
  return { ...DEFAULT_CONTACT_INFO };
}

// ── Pricing config (kurs + cene planova) ──

const DEFAULT_PRICING = {
  eurToRsdRate: 117.5,
  premiumPriceEur: 49,
  premiumVenuePriceEur: 79,
};

export async function getPricingConfig() {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    return {
      eurToRsdRate: row?.eurToRsdRate ?? DEFAULT_PRICING.eurToRsdRate,
      premiumPriceEur: row?.premiumPriceEur ?? DEFAULT_PRICING.premiumPriceEur,
      premiumVenuePriceEur: row?.premiumVenuePriceEur ?? DEFAULT_PRICING.premiumVenuePriceEur,
    };
  } catch {
    return { ...DEFAULT_PRICING };
  }
}

export async function setPricingConfig({ eurToRsdRate, premiumPriceEur, premiumVenuePriceEur }) {
  const clamp = (v, fallback, min, max) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
  };
  const data = {
    eurToRsdRate: clamp(eurToRsdRate, 117.5, 1, 500),
    premiumPriceEur: clamp(premiumPriceEur, 49, 1, 10000),
    premiumVenuePriceEur: clamp(premiumVenuePriceEur, 79, 1, 10000),
  };
  await prisma.siteConfig.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  return data;
}

export async function setContactInfo({ email, phone, location, instagram, facebook }) {
  const data = {
    email: String(email || '').trim(),
    phone: String(phone || '').trim(),
    location: String(location || '').trim(),
    instagram: String(instagram || '').trim(),
    facebook: String(facebook || '').trim(),
  };
  await prisma.siteConfig.upsert({
    where: { id: 1 },
    create: { id: 1, contactInfoJson: JSON.stringify(data) },
    update: { contactInfoJson: JSON.stringify(data) },
  });
  return data;
}
