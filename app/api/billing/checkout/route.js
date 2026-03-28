import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const PREMIUM_PRICE_EUR = 49;

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe nije konfigurisan na serveru.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const plan = body?.plan || 'premium';
    const email = String(body?.email || '').trim().toLowerCase();

    if (plan !== 'premium') {
      return NextResponse.json({ error: 'Nepoznat plan.' }, { status: 400 });
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Unesite validan email za naplatu.' },
        { status: 400 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      metadata: { plan: 'PREMIUM', email },
      line_items: [
        {
          price_data: {
            currency: 'eur',
            recurring: { interval: 'month' },
            unit_amount: PREMIUM_PRICE_EUR * 100,
            product_data: {
              name: 'Premium Venue',
              description:
                'Live Request sistem, prioritetni booking i promocija na platformi.',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/premium/success`,
      cancel_url: `${request.nextUrl.origin}/premium/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Greška pri pokretanju plaćanja.' },
      { status: 500 }
    );
  }
}
