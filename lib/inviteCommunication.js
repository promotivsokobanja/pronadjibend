import prisma from './prisma';

const DEFAULT_SETTINGS = {
  inviteMaxActiveBasic: 5,
  inviteMaxActivePremium: 20,
  inviteExpireDays: 14,
  inviteCleanupDays: 180,
  inviteEmailNotifications: true,
};

const PREMIUM_PLANS = new Set(['PREMIUM', 'PREMIUM_VENUE']);
const ACTIVE_INVITE_STATUSES = ['PENDING', 'ACCEPTED'];
const ARCHIVE_INVITE_STATUSES = ['REJECTED', 'CANCELLED', 'EXPIRED'];

function hasPremiumPlan(plan) {
  return PREMIUM_PLANS.has(String(plan || '').toUpperCase());
}

function normalizeSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const clampInt = (value, fallback, min, max) => {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n)) return fallback;
    return Math.min(Math.max(n, min), max);
  };
  return {
    inviteMaxActiveBasic: clampInt(source.inviteMaxActiveBasic, DEFAULT_SETTINGS.inviteMaxActiveBasic, 1, 100),
    inviteMaxActivePremium: clampInt(source.inviteMaxActivePremium, DEFAULT_SETTINGS.inviteMaxActivePremium, 1, 500),
    inviteExpireDays: clampInt(source.inviteExpireDays, DEFAULT_SETTINGS.inviteExpireDays, 1, 365),
    inviteCleanupDays: clampInt(source.inviteCleanupDays, DEFAULT_SETTINGS.inviteCleanupDays, 7, 3650),
    inviteEmailNotifications: typeof source.inviteEmailNotifications === 'boolean'
      ? source.inviteEmailNotifications
      : DEFAULT_SETTINGS.inviteEmailNotifications,
  };
}

export async function getInviteCommunicationSettings() {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    const raw = String(row?.inviteCommunicationJson || '').trim();
    if (!raw) return { ...DEFAULT_SETTINGS };
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function setInviteCommunicationSettings(settings) {
  const normalized = normalizeSettings(settings);
  await prisma.siteConfig.upsert({
    where: { id: 1 },
    create: { id: 1, inviteCommunicationJson: JSON.stringify(normalized) },
    update: { inviteCommunicationJson: JSON.stringify(normalized) },
  });
  return normalized;
}

export function getInviteLimitForPlan(plan, settings) {
  return hasPremiumPlan(plan) ? settings.inviteMaxActivePremium : settings.inviteMaxActiveBasic;
}

export async function expireStaleInvites() {
  const settings = await getInviteCommunicationSettings();
  const cutoff = new Date(Date.now() - settings.inviteExpireDays * 24 * 60 * 60 * 1000);
  const result = await prisma.musicianInvite.updateMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: cutoff },
    },
    data: { status: 'EXPIRED' },
  });
  return { updated: result.count, cutoff, settings };
}

export async function cleanupArchivedInvites(days) {
  const settings = await getInviteCommunicationSettings();
  const keepDays = Math.max(1, Math.floor(Number(days) || settings.inviteCleanupDays));
  const cutoff = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);
  const staleIds = await prisma.musicianInvite.findMany({
    where: {
      status: { in: ARCHIVE_INVITE_STATUSES },
      updatedAt: { lt: cutoff },
    },
    select: { id: true },
    take: 1000,
  });
  if (!staleIds.length) return { deletedInvites: 0, deletedMessages: 0, keepDays };
  const ids = staleIds.map((item) => item.id);
  const deletedMessages = await prisma.message.deleteMany({ where: { inviteId: { in: ids } } });
  const deletedInvites = await prisma.musicianInvite.deleteMany({ where: { id: { in: ids } } });
  return { deletedInvites: deletedInvites.count, deletedMessages: deletedMessages.count, keepDays };
}

export async function findInviteBlock({ actorBandId, actorMusicianId, targetBandId, targetMusicianId }) {
  const ors = [];
  if (actorBandId && targetMusicianId) {
    ors.push({ blockerBandId: actorBandId, blockedMusicianId: targetMusicianId });
  }
  if (actorMusicianId && targetBandId) {
    ors.push({ blockerMusicianId: actorMusicianId, blockedBandId: targetBandId });
  }
  if (actorMusicianId && targetMusicianId) {
    ors.push({ blockerMusicianId: actorMusicianId, blockedMusicianId: targetMusicianId });
  }
  if (targetBandId && actorMusicianId) {
    ors.push({ blockerBandId: targetBandId, blockedMusicianId: actorMusicianId });
  }
  if (targetMusicianId && actorBandId) {
    ors.push({ blockerMusicianId: targetMusicianId, blockedBandId: actorBandId });
  }
  if (targetMusicianId && actorMusicianId) {
    ors.push({ blockerMusicianId: targetMusicianId, blockedMusicianId: actorMusicianId });
  }
  if (!ors.length) return null;
  return prisma.inviteBlock.findFirst({ where: { OR: ors }, orderBy: { createdAt: 'desc' } });
}

export async function countActiveInvitesForSender({ bandId, musicianId }) {
  const where = { status: { in: ACTIVE_INVITE_STATUSES } };
  if (bandId) where.bandId = bandId;
  if (musicianId) where.senderMusicianId = musicianId;
  return prisma.musicianInvite.count({ where });
}

export async function upsertInviteBlock({ blockerBandId, blockerMusicianId, blockedBandId, blockedMusicianId }) {
  const existing = await prisma.inviteBlock.findFirst({
    where: {
      blockerBandId: blockerBandId || null,
      blockerMusicianId: blockerMusicianId || null,
      blockedBandId: blockedBandId || null,
      blockedMusicianId: blockedMusicianId || null,
    },
  });
  if (existing) return existing;
  return prisma.inviteBlock.create({
    data: {
      blockerBandId: blockerBandId || null,
      blockerMusicianId: blockerMusicianId || null,
      blockedBandId: blockedBandId || null,
      blockedMusicianId: blockedMusicianId || null,
    },
  });
}

export { ACTIVE_INVITE_STATUSES, ARCHIVE_INVITE_STATUSES, hasPremiumPlan };
