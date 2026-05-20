import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET  → Returns online visitors count (unique visitors in last 5 min)
 * POST → Records a visit (called from client heartbeat)
 */

export async function GET() {
  try {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = await prisma.siteVisit.groupBy({
      by: ['visitorId'],
      where: { createdAt: { gte: fiveMinAgo } },
    });
    return NextResponse.json({ online: result.length });
  } catch (error) {
    console.error('site-visits GET:', error);
    return NextResponse.json({ online: 0 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const visitorId = body.visitorId;
    if (!visitorId || typeof visitorId !== 'string' || visitorId.length > 64) {
      return NextResponse.json({ error: 'Invalid visitorId' }, { status: 400 });
    }

    await prisma.siteVisit.create({
      data: {
        visitorId,
        path: (body.path || '/').slice(0, 255),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('site-visits POST:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
