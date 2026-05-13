import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/notifications — fetch user's notifications
export async function GET(req) {
  try {
    const authUser = await getAuthUserFromRequest(req);
    if (!authUser?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = { id: authUser.userId };

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === '1';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    const where = { userId: user.id };
    if (unreadOnly) where.read = false;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: user.id, read: false },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Notifications GET error:', err);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

// PATCH /api/notifications — mark notifications as read
export async function PATCH(req) {
  try {
    const authUser = await getAuthUserFromRequest(req);
    if (!authUser?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = { id: authUser.userId };

    const body = await req.json().catch(() => ({}));
    const { ids, markAll } = body;

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
    } else if (Array.isArray(ids) && ids.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId: user.id },
        data: { read: true },
      });
    }

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });

    return NextResponse.json({ ok: true, unreadCount });
  } catch (err) {
    console.error('Notifications PATCH error:', err);
    return NextResponse.json({ error: 'Greška pri ažuriranju obaveštenja.' }, { status: 500 });
  }
}
