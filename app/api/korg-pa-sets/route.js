import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../lib/auth';
import { getKorgPaItems } from '../../../lib/siteConfig';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await getAuthUserFromRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Morate biti prijavljeni.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        role: true,
        plan: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json({ error: 'Korisnik nije pronađen.' }, { status: 404 });
    }

    const plan = String(user.plan || '').toUpperCase();
    const isAllowed = user.role === 'ADMIN' || plan === 'PREMIUM_VENUE';
    if (!isAllowed) {
      return NextResponse.json({ error: 'Pristup je dostupan samo Premium Venue korisnicima.' }, { status: 403 });
    }

    const items = await getKorgPaItems();
    if (!items.length) {
      return NextResponse.json({ error: 'Korg PA setovi trenutno nisu dostupni za preuzimanje.' }, { status: 404 });
    }

    return NextResponse.json({ items, url: items[0].url, available: true });
  } catch (error) {
    console.error('Korg PA sets GET error:', error);
    return NextResponse.json({ error: 'Greška pri učitavanju Korg PA linka.' }, { status: 500 });
  }
}
