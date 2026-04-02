import { NextResponse } from 'next/server';
import { getMaintenanceMode } from '@/lib/siteConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  const maintenanceMode = await getMaintenanceMode();
  return NextResponse.json({ maintenanceMode });
}
