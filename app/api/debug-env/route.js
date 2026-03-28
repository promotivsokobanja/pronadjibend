import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    hasDbUrl: Boolean(process.env.DATABASE_URL),
    dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) || 'UNDEFINED',
    hasJwt: Boolean(process.env.JWT_SECRET),
    nodeEnv: process.env.NODE_ENV,
    hasSupabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  });
}
