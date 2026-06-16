import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function requireAdmin(request) {
  const auth = await getAuthUserFromRequest(request);
  if (!auth?.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, role: true },
  });
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

// GET — list all access requests (optionally filter by status)
export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Nemate dozvolu.' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // PENDING, APPROVED, DENIED

    const where = status ? { status } : {};

    const requests = await prisma.demoSongAccess.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      include: {
        song: { select: { id: true, title: true, artist: true, price: true } },
      },
    });

    // Get user emails for display
    const userIds = [...new Set(requests.map((r) => r.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, plan: true, band: { select: { name: true } }, musicianProfile: { select: { name: true } } },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const enriched = requests.map((r) => ({
      ...r,
      user: userMap[r.userId] || { email: 'Nepoznat', plan: '' },
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('[admin/demo-songs/access GET]', err);
    return NextResponse.json({ error: 'Greška.' }, { status: 500 });
  }
}

// PATCH — approve or deny a request
export async function PATCH(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Nemate dozvolu.' }, { status: 403 });

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !['APPROVED', 'DENIED', 'PAID'].includes(status)) {
      return NextResponse.json({ error: 'Nevalidni parametri.' }, { status: 400 });
    }

    const existing = await prisma.demoSongAccess.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Zahtev nije pronađen.' }, { status: 404 });
    }

    const updated = await prisma.demoSongAccess.update({
      where: { id },
      data: { status, resolvedAt: new Date() },
    });

    // When payment is confirmed, deactivate the song so it disappears from public listing
    if (status === 'PAID') {
      await prisma.demoSong.update({
        where: { id: existing.songId },
        data: { isActive: false },
      });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[admin/demo-songs/access PATCH]', err);
    return NextResponse.json({ error: 'Greška.' }, { status: 500 });
  }
}
