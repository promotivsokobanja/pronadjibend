import { NextResponse } from 'next/server';
import { getBandProfileMediaLimits } from '../../../../lib/siteConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  const limits = await getBandProfileMediaLimits();
  return NextResponse.json(limits);
}
