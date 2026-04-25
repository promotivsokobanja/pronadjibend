import prisma from './prisma';

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
