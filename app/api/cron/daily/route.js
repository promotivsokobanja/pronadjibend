import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { sendRenewalReminder, sendNudgeEmail } from '../../../../lib/email';
import {
  generateIpsQrString,
  generateReferenceId,
  calculateAmount,
} from '../../../../lib/ipsQr';
import { getPricingConfig } from '../../../../lib/siteConfig';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET || '';
const REMINDER_DAYS_BEFORE = 3;
const NUDGE_PROFILE_THRESHOLD = 50; // procenat

/**
 * GET /api/cron/daily
 * Poziva se jednom dnevno (Netlify Scheduled Function, GitHub Actions, ili cURL cron).
 * Zaštićena CRON_SECRET headerom.
 *
 * Zadaci:
 * 1. Slanje email podsetnika 3 dana pre isteka pretplate (sa QR za obnovu)
 * 2. Automatski downgrade na BASIC kad planUntil prođe
 * 3. Nudge email Free korisnicima sa < 50% popunjenim profilom
 */
export async function GET(request) {
  // ── Autorizacija ──
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  if (CRON_SECRET && token !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    reminders: { sent: 0, failed: 0, errors: [] },
    downgrades: { count: 0 },
    nudges: { sent: 0, failed: 0, errors: [] },
  };

  try {
    const pricing = await getPricingConfig();

    // ══════════════════════════════════════════════════════════
    // 1. Podsetnici za obnovu (7 dana pre isteka)
    // ══════════════════════════════════════════════════════════
    const reminderCutoff = new Date();
    reminderCutoff.setDate(reminderCutoff.getDate() + REMINDER_DAYS_BEFORE);

    const reminderStart = new Date();
    reminderStart.setDate(reminderStart.getDate() + REMINDER_DAYS_BEFORE - 1);

    const expiringUsers = await prisma.user.findMany({
      where: {
        plan: { in: ['PREMIUM', 'PREMIUM_VENUE'] },
        planUntil: {
          gte: reminderStart,
          lte: reminderCutoff,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        plan: true,
        planUntil: true,
        band: { select: { name: true } },
        musicianProfile: { select: { name: true } },
      },
    });

    for (const user of expiringUsers) {
      try {
        // Generiši QR za obnovu
        let qrDataUrl = null;
        try {
          const { amountRsd } = calculateAmount(user.plan, pricing.eurToRsdRate, {
            PREMIUM: pricing.premiumPriceEur,
            PREMIUM_VENUE: pricing.premiumVenuePriceEur,
          });
          const refId = generateReferenceId();
          const ipsString = generateIpsQrString({
            referenceId: refId,
            plan: user.plan,
            amountRsd,
          });
          qrDataUrl = await QRCode.toDataURL(ipsString, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 250,
          });
        } catch (qrErr) {
          console.error(`[cron] QR generation failed for ${user.email}:`, qrErr);
        }

        const userName = user.band?.name || user.musicianProfile?.name || '';
        const emailResult = await sendRenewalReminder({
          to: user.email,
          userName,
          plan: user.plan,
          expiresAt: user.planUntil,
          qrDataUrl,
        });

        if (emailResult.success) {
          results.reminders.sent++;
        } else {
          results.reminders.failed++;
          results.reminders.errors.push(`${user.email}: ${emailResult.error}`);
        }
      } catch (err) {
        results.reminders.failed++;
        results.reminders.errors.push(`${user.email}: ${err.message}`);
      }
    }

    // ══════════════════════════════════════════════════════════
    // 2. Automatski downgrade isteklih pretplata
    // ══════════════════════════════════════════════════════════
    const now = new Date();
    const expiredResult = await prisma.user.updateMany({
      where: {
        plan: { in: ['PREMIUM', 'PREMIUM_VENUE'] },
        planUntil: { lt: now },
        deletedAt: null,
      },
      data: {
        plan: 'BASIC',
      },
    });
    results.downgrades.count = expiredResult.count;

    // Downgrade Band.plan za iste korisnike
    if (expiredResult.count > 0) {
      const expiredUserIds = await prisma.user.findMany({
        where: {
          plan: 'BASIC',
          planUntil: { lt: now },
          bandId: { not: null },
          deletedAt: null,
        },
        select: { bandId: true },
      });

      const bandIds = expiredUserIds.map((u) => u.bandId).filter(Boolean);
      if (bandIds.length) {
        await prisma.band.updateMany({
          where: { id: { in: bandIds } },
          data: { plan: 'FREE', isPaid: false },
        });
      }
    }

    // ══════════════════════════════════════════════════════════
    // 3. Nudge email za Free korisnike sa nepopunjenim profilom
    // ══════════════════════════════════════════════════════════
    const freeUsersWithBands = await prisma.user.findMany({
      where: {
        plan: 'BASIC',
        role: 'BAND',
        deletedAt: null,
        createdAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, // bar 3 dana star
      },
      select: {
        email: true,
        band: {
          select: {
            name: true,
            bio: true,
            img: true,
            videoUrl: true,
            audioUrl: true,
            genre: true,
            location: true,
            priceRange: true,
          },
        },
      },
      take: 50, // batch limit
    });

    for (const user of freeUsersWithBands) {
      if (!user.band) continue;
      const b = user.band;
      // Jednostavan profil completeness procenat
      const fields = [b.name, b.bio, b.img, b.videoUrl, b.genre, b.location, b.priceRange];
      const filled = fields.filter(Boolean).length;
      const pct = Math.round((filled / fields.length) * 100);

      if (pct >= NUDGE_PROFILE_THRESHOLD) continue;

      try {
        const emailResult = await sendNudgeEmail({
          to: user.email,
          userName: b.name || '',
          profilePercent: pct,
        });
        if (emailResult.success) {
          results.nudges.sent++;
        } else {
          results.nudges.failed++;
          results.nudges.errors.push(`${user.email}: ${emailResult.error}`);
        }
      } catch (err) {
        results.nudges.failed++;
        results.nudges.errors.push(`${user.email}: ${err.message}`);
      }
    }
  } catch (error) {
    console.error('[cron] Fatal error:', error);
    return NextResponse.json({ error: error.message, results }, { status: 500 });
  }

  console.log('[cron/daily] Results:', JSON.stringify(results));
  return NextResponse.json({ ok: true, results });
}
