import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  let dbTest = 'not tested';
  let dbError = null;
  try {
    const count = await prisma.user.count();
    dbTest = `OK - ${count} users`;
  } catch (e) {
    dbTest = 'FAILED';
    dbError = { name: e.name, message: e.message?.substring(0, 200), code: e.code };
  }
  return NextResponse.json({
    hasDbUrl: Boolean(process.env.DATABASE_URL),
    dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) || 'UNDEFINED',
    dbTest,
    dbError,
    nodeEnv: process.env.NODE_ENV,
  });
}
