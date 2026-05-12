import { NextResponse } from 'next/server';
import { getContactInfo } from '../../../../lib/siteConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const contact = await getContactInfo();
    return NextResponse.json(contact);
  } catch {
    return NextResponse.json({
      email: 'office@pronadjibend.rs',
      phone: '+381 64 339 2339',
      location: 'Sokobanja, Srbija',
      instagram: 'https://instagram.com/pronadjiband',
      facebook: '',
    });
  }
}
