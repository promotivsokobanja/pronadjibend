import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../../lib/auth';
import { createNotifications } from '../../../../lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const auth = await getAuthUserFromRequest(request);
    if (!auth?.userId || auth.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nemate pristup.' }, { status: 403 });
    }

    const { title, body, link, target } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Naslov i poruka su obavezni.' }, { status: 400 });
    }
    if (title.length > 100) {
      return NextResponse.json({ error: 'Naslov max 100 karaktera.' }, { status: 400 });
    }
    if (body.length > 500) {
      return NextResponse.json({ error: 'Poruka max 500 karaktera.' }, { status: 400 });
    }

    // target: 'ALL' | 'BAND' | 'MUSICIAN' | 'CLIENT'
    const where = { deletedAt: null };
    if (target && target !== 'ALL') {
      where.role = target;
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true },
    });

    if (users.length === 0) {
      return NextResponse.json({ error: 'Nema korisnika u izabranoj grupi.' }, { status: 404 });
    }

    const items = users.map(u => ({
      userId: u.id,
      type: 'SYSTEM',
      title: title.trim(),
      body: body.trim(),
      link: link?.trim() || null,
    }));

    await createNotifications(items);

    return NextResponse.json({ ok: true, sent: users.length });
  } catch (err) {
    console.error('[broadcast]', err);
    return NextResponse.json({ error: 'Greška pri slanju.' }, { status: 500 });
  }
}
