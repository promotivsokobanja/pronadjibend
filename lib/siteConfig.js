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
