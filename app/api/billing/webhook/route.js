import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Stripe webhook nije konfigurisan.' },
        { status: 503 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Nedostaje Stripe potpis.' }, { status: 400 });
    }

    const rawBody = await request.text();
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = String(
        session.customer_details?.email ||
          session.customer_email ||
          session.metadata?.email ||
          ''
      )
        .trim()
        .toLowerCase();

      if (email) {
        await prisma.user.updateMany({
          where: { email },
          data: { plan: 'PREMIUM', planUntil: null },
        });
      }

      await prisma.billingEvent.upsert({
        where: { stripeSessionId: session.id },
        create: {
          stripeSessionId: session.id,
          stripeCustomerId: String(session.customer || ''),
          stripeSubscription: String(session.subscription || ''),
          customerEmail: email || null,
          status: 'COMPLETED',
        },
        update: {
          stripeCustomerId: String(session.customer || ''),
          stripeSubscription: String(session.subscription || ''),
          customerEmail: email || null,
          status: 'COMPLETED',
        },
      });
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      await prisma.billingEvent.upsert({
        where: { stripeSessionId: session.id },
        create: {
          stripeSessionId: session.id,
          stripeCustomerId: String(session.customer || ''),
          stripeSubscription: String(session.subscription || ''),
          customerEmail:
            String(session.customer_email || '').trim().toLowerCase() || null,
          status: 'EXPIRED',
        },
        update: { status: 'EXPIRED' },
      });
    }

    if (
      event.type === 'customer.subscription.deleted' ||
      event.type === 'customer.subscription.updated'
    ) {
      const subscription = event.data.object;
      const status = String(subscription.status || '').toLowerCase();
      const customerId = String(subscription.customer || '');

      if (!customerId) {
        return NextResponse.json({ received: true });
      }

      const billingRecord = await prisma.billingEvent.findFirst({
        where: { stripeCustomerId: customerId },
        orderBy: { createdAt: 'desc' },
      });

      const shouldDeactivate =
        event.type === 'customer.subscription.deleted' ||
        ['canceled', 'unpaid', 'incomplete_expired', 'past_due'].includes(status);

      if (shouldDeactivate && billingRecord?.customerEmail) {
        await prisma.user.updateMany({
          where: { email: billingRecord.customerEmail },
          data: { plan: 'BASIC', planUntil: null },
        });
      }

      await prisma.billingEvent.updateMany({
        where: { stripeCustomerId: customerId },
        data: { status: shouldDeactivate ? 'CANCELLED' : 'ACTIVE' },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook greška.' }, { status: 400 });
  }
}
