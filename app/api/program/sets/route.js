import { NextResponse } from 'next/server';
import { ownerFromProgramKey, userOfOwner } from '@/lib/programKey';
import { getKorgPaItems } from '@/lib/siteConfig';

export const dynamic = 'force-dynamic';

/** Korg PA setovi za preuzimanje (isti spisak kao na sajtu) – za program / tablet, samo za Premium Venue. */
export async function GET(request) {
  const owner = await ownerFromProgramKey(request);
  if (!owner) return NextResponse.json({ error: 'Pogrešan ključ.' }, { status: 401 });
  const user = await userOfOwner(owner);
  const plan = String(user?.plan || '').toUpperCase();
  if (!user || user.deletedAt || !(user.role === 'ADMIN' || plan === 'PREMIUM_VENUE')) {
    return NextResponse.json({ items: [], allowed: false, error: 'Korg setovi su dostupni samo Premium Venue članovima.' });
  }
  const items = await getKorgPaItems();
  return NextResponse.json({ items, allowed: true });
}
