import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../../lib/auth';
import {
  generateIpsQrString,
  generateReferenceId,
  calculateAmount,
} from '../../../../lib/ipsQr';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

const VALID_PLANS = new Set(['PREMIUM', 'PREMIUM_VENUE']);
const MAX_RETRIES = 5;

/**
 * POST /api/billing/generate-qr
 * Body: { plan: "PREMIUM" | "PREMIUM_VENUE", billingData?: { companyName, pib, mb, address } }
 *
 * Kreira Payment zapis sa statusom PENDING_QR i vraća:
 * - qrDataUrl  (base64 PNG QR slika)
 * - ipsString  (raw IPS string za debug)
 * - payment    (id, referenceId, amountRsd, amountEur, plan)
 */
export async function POST(request) {
  try {
    // ── Auth ──
    const auth = await getAuthUserFromRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Morate biti prijavljeni.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, plan: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json({ error: 'Nalog nije pronađen.' }, { status: 404 });
    }

    // ── Validacija body-ja ──
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Neispravan JSON.' }, { status: 400 });
    }

    const plan = String(body.plan || '').toUpperCase();
    if (!VALID_PLANS.has(plan)) {
      return NextResponse.json(
        { error: 'Plan mora biti PREMIUM ili PREMIUM_VENUE.' },
        { status: 400 }
      );
    }

    // ── Provera da nema aktivnog PENDING_QR za isti plan ──
    const existingPending = await prisma.payment.findFirst({
      where: {
        userId: user.id,
        plan,
        status: 'PENDING_QR',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingPending) {
      // Vrati postojeći QR umesto da pravi novi
      try {
        const config = await prisma.siteConfig.findUnique({ where: { id: 1 } });
        const rate = config?.eurToRsdRate || 117.5;
        const prices = {
          PREMIUM: config?.premiumPriceEur || 49,
          PREMIUM_VENUE: config?.premiumVenuePriceEur || 79,
        };
        const { amountEur, amountRsd } = calculateAmount(plan, rate, prices);

        const ipsString = generateIpsQrString({
          referenceId: existingPending.referenceId,
          plan,
          amountRsd,
        });

        const qrDataUrl = await QRCode.toDataURL(ipsString, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 300,
        });

        return NextResponse.json({
          qrDataUrl,
          ipsString,
          payment: {
            id: existingPending.id,
            referenceId: existingPending.referenceId,
            amountRsd: existingPending.amountRsd,
            amountEur: existingPending.amountEur,
            plan: existingPending.plan,
            status: existingPending.status,
          },
          reused: true,
        });
      } catch (qrErr) {
        console.error('QR regeneration error:', qrErr);
        // Nastavi sa kreiranjem novog ako regeneracija ne uspe
      }
    }

    // ── Učitaj cene i kurs iz SiteConfig ──
    const config = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    const eurToRsdRate = config?.eurToRsdRate || 117.5;
    const prices = {
      PREMIUM: config?.premiumPriceEur || 49,
      PREMIUM_VENUE: config?.premiumVenuePriceEur || 79,
    };

    const { amountEur, amountRsd } = calculateAmount(plan, eurToRsdRate, prices);

    // ── Generiši jedinstven referenceId (retry loop za kolizije) ──
    let referenceId;
    let created = false;
    let payment;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      referenceId = generateReferenceId();
      try {
        payment = await prisma.payment.create({
          data: {
            userId: user.id,
            userEmail: user.email,
            plan,
            amountRsd,
            amountEur,
            referenceId,
            status: 'PENDING_QR',
          },
        });
        created = true;
        break;
      } catch (err) {
        // Unique constraint violation na referenceId — pokušaj ponovo
        if (err.code === 'P2002' && err.meta?.target?.includes('referenceId')) {
          continue;
        }
        throw err;
      }
    }

    if (!created) {
      return NextResponse.json(
        { error: 'Nije moguće generisati jedinstven poziv na broj. Pokušajte ponovo.' },
        { status: 500 }
      );
    }

    // ── Sačuvaj billing data korisnika ako je prosleđen ──
    if (body.billingData && typeof body.billingData === 'object') {
      try {
        const bd = {
          companyName: String(body.billingData.companyName || '').trim().slice(0, 200),
          pib: String(body.billingData.pib || '').trim().slice(0, 20),
          mb: String(body.billingData.mb || '').trim().slice(0, 20),
          address: String(body.billingData.address || '').trim().slice(0, 300),
        };
        await prisma.user.update({
          where: { id: user.id },
          data: { billingDataJson: JSON.stringify(bd) },
        });
      } catch (bdErr) {
        console.error('billingData save warning:', bdErr);
        // Ne blokiramo QR generisanje ako billing data ne uspe da se sačuva
      }
    }

    // ── Generiši IPS QR string ──
    const ipsString = generateIpsQrString({
      referenceId,
      plan,
      amountRsd,
    });

    // ── Generiši QR kod sliku (base64 PNG) ──
    let qrDataUrl;
    try {
      qrDataUrl = await QRCode.toDataURL(ipsString, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 300,
      });
    } catch (qrErr) {
      console.error('QR code generation error:', qrErr);
      return NextResponse.json(
        { error: 'Greška pri generisanju QR koda.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      qrDataUrl,
      ipsString,
      payment: {
        id: payment.id,
        referenceId: payment.referenceId,
        amountRsd: payment.amountRsd,
        amountEur: payment.amountEur,
        plan: payment.plan,
        status: payment.status,
      },
      reused: false,
    });
  } catch (error) {
    console.error('Generate QR API error:', error);
    return NextResponse.json(
      { error: 'Greška na serveru pri generisanju QR koda.' },
      { status: 500 }
    );
  }
}
