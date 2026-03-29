import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';
import { renderMarketingPosterPng } from '@/lib/marketingPoster';
import { getSiteUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

function asciiFilename(name) {
  const s = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);
  return s || 'bend';
}

export async function GET(request, context) {
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID je obavezan.' }, { status: 400 });
  }

  const authUser = await getAuthUserFromRequest(request);
  if (!authUser?.userId) {
    return NextResponse.json({ error: 'Neautentifikovano.' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: { role: true, bandId: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'Korisnik nije pronađen.' }, { status: 404 });
  }

  const can = user.role === 'ADMIN' || user.bandId === id;
  if (!can) {
    return NextResponse.json({ error: 'Nemate dozvolu.' }, { status: 403 });
  }

  const band = await prisma.band.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!band) {
    return NextResponse.json({ error: 'Bend nije pronađen.' }, { status: 404 });
  }

  const qrUrl = `${getSiteUrl()}/live/${band.id}`;

  try {
    const buffer = await renderMarketingPosterPng({
      qrUrl,
      bandDisplayName: band.name,
    });

    const ascii = asciiFilename(band.name);
    const fallback = `bend-${band.id.slice(0, 8)}`;
    const shortName = ascii.length >= 2 ? ascii : fallback;
    const utf8Name = `pronadjibend-poster-${band.name || 'bend'}.png`;
    const filenameStar = encodeURIComponent(utf8Name);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="pronadjibend-poster-${shortName}.png"; filename*=UTF-8''${filenameStar}`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    console.error('marketing-poster', e);
    return NextResponse.json({ error: 'Generisanje postera nije uspelo.' }, { status: 500 });
  }
}
