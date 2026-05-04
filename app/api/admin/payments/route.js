import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../../lib/auth';
import { generateInvoicePdf, generateInvoiceNumber } from '../../../../lib/invoice';
import { sendInvoiceEmail } from '../../../../lib/email';

export const dynamic = 'force-dynamic';

// ── GET: Lista uplata ────────────────────────────────────────

export async function GET(request) {
  try {
    const auth = await getAuthUserFromRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Neautorizovan.' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: true },
    });

    if (admin?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Pristup odbijen.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 30));
    const status = searchParams.get('status') || '';
    const skip = (page - 1) * limit;

    const where = {};
    if (status) {
      where.status = status;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              plan: true,
              planUntil: true,
              billingDataJson: true,
              band: { select: { name: true } },
              musicianProfile: { select: { name: true } },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      payments,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('Admin payments GET error:', error);
    return NextResponse.json({ error: 'Greška.' }, { status: 500 });
  }
}

// ── POST: Potvrdi uplatu (atomarno) ──────────────────────────

export async function POST(request) {
  try {
    const auth = await getAuthUserFromRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Neautorizovan.' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: true },
    });

    if (admin?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Pristup odbijen.' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Neispravan JSON.' }, { status: 400 });
    }

    const paymentId = body.paymentId;
    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId je obavezan.' }, { status: 400 });
    }

    // ── Učitaj payment sa korisnikom ──
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            billingDataJson: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Uplata nije pronađena.' }, { status: 404 });
    }

    if (payment.status !== 'PENDING_QR') {
      return NextResponse.json(
        { error: `Uplata je već u statusu: ${payment.status}` },
        { status: 400 }
      );
    }

    // ── Generiši broj računa ──
    const confirmedCount = await prisma.payment.count({
      where: { status: { in: ['CONFIRMED', 'INVOICE_SENT'] } },
    });
    const invoiceNumber = generateInvoiceNumber(confirmedCount);

    // ── Datum isteka: +30 dana od danas (mesečna pretplata) ──
    const now = new Date();
    const planUntil = new Date(now);
    planUntil.setDate(planUntil.getDate() + 30);

    // ── Učitaj kurs za PDF ──
    const config = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    const eurToRsdRate = config?.eurToRsdRate || 117.5;

    // ── Parsiraj billing data korisnika ──
    let billingData = null;
    try {
      if (payment.user?.billingDataJson) {
        billingData = JSON.parse(payment.user.billingDataJson);
      }
    } catch {
      billingData = null;
    }

    // ══════════════════════════════════════════════════════════
    // ATOMARNA TRANSAKCIJA: status, datum, payment update
    // ══════════════════════════════════════════════════════════
    const [updatedPayment] = await prisma.$transaction([
      // 1. Ažuriraj Payment → CONFIRMED
      prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: now,
          confirmedByUserId: auth.userId,
          invoiceNumber,
        },
      }),
      // 2. Ažuriraj User → plan + planUntil + lastPaymentId
      prisma.user.update({
        where: { id: payment.userId },
        data: {
          plan: payment.plan,
          planUntil,
          lastPaymentId: paymentId,
        },
      }),
      // 3. Ažuriraj Band plan ako postoji
      ...(payment.user?.id
        ? [
            prisma.band.updateMany({
              where: {
                user: { id: payment.userId },
              },
              data: {
                plan: payment.plan,
                isPaid: true,
              },
            }),
          ]
        : []),
    ]);

    // ══════════════════════════════════════════════════════════
    // POST-TRANSAKCIJA: PDF + Email (ne blokira potvrdu)
    // ══════════════════════════════════════════════════════════
    let invoiceSent = false;
    let invoiceError = null;

    try {
      // 4. Generiši PDF račun
      const pdfBuffer = generateInvoicePdf({
        invoiceNumber,
        plan: payment.plan,
        amountRsd: payment.amountRsd,
        amountEur: payment.amountEur,
        eurToRsdRate,
        referenceId: payment.referenceId,
        userEmail: payment.userEmail,
        billingData,
        date: now,
        planUntil,
      });

      // 5. Pošalji email sa PDF računom
      const emailResult = await sendInvoiceEmail({
        to: payment.userEmail,
        pdfBuffer,
        invoiceNumber,
        plan: payment.plan,
      });

      if (emailResult.success) {
        // 6. Ažuriraj Payment → INVOICE_SENT
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'INVOICE_SENT' },
        });
        invoiceSent = true;
      } else {
        invoiceError = emailResult.error;
        console.error(`[payments] Invoice email failed for ${paymentId}:`, emailResult.error);
      }
    } catch (pdfEmailErr) {
      invoiceError = pdfEmailErr.message;
      console.error(`[payments] PDF/Email error for ${paymentId}:`, pdfEmailErr);
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: updatedPayment.id,
        status: invoiceSent ? 'INVOICE_SENT' : 'CONFIRMED',
        invoiceNumber,
        plan: payment.plan,
        planUntil: planUntil.toISOString(),
      },
      invoiceSent,
      invoiceError,
    });
  } catch (error) {
    console.error('Admin payments POST error:', error);
    return NextResponse.json({ error: 'Greška pri potvrdi uplate.' }, { status: 500 });
  }
}
