import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/adminAuth';
import { hasDatabaseUrl } from '../../../../lib/dbClientErrors';
import { getDemoBandsEnvOverrideHint, getShowDemoBands } from '../../../../lib/siteConfig';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const showDemoBands = await getShowDemoBands();
  const demoBandsEnv = getDemoBandsEnvOverrideHint();

  return NextResponse.json({
    databaseUrl: hasDatabaseUrl(),
    jwtSecret: Boolean(
      process.env.JWT_SECRET?.length >= 32 || process.env.NEXTAUTH_SECRET?.length >= 32
    ),
    stripeSecret: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    nodeEnv: process.env.NODE_ENV || 'development',
    showDemoBands,
    demoBandsEnvLocked: Boolean(demoBandsEnv),
    demoBandsEnvValue: demoBandsEnv,
  });
}
