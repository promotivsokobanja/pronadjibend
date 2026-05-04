import { NextResponse } from 'next/server';
import { getPricingConfig } from '../../../../lib/siteConfig';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/pricing
 * Javna ruta — vraća trenutne cene i kurs za prikaz na /upgrade stranici.
 */
export async function GET() {
  try {
    const config = await getPricingConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Pricing API error:', error);
    return NextResponse.json(
      { eurToRsdRate: 117.5, premiumPriceEur: 49, premiumVenuePriceEur: 79 }
    );
  }
}
