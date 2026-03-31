import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '../../../../lib/auth';
import { getBandProfileMediaLimits } from '../../../../lib/siteConfig';

export const dynamic = 'force-dynamic';

function isAllowedVideoUrl(url) {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host.includes('youtube.com') ||
      host.includes('youtu.be') ||
      host.includes('youtube-nocookie.com') ||
      host.includes('vimeo.com') ||
      host.includes('res.cloudinary.com')
    );
  } catch {
    return false;
  }
}

function countUrlsInText(text) {
  if (!text) return 0;
  const matches = String(text).match(/https?:\/\/[^\s]+/gi);
  return matches ? matches.length : 0;
}

export async function GET(request) {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();

  if (!id || id === '[id]') {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  try {
    const band = await prisma.band.findUnique({
      where: { id },
      include: {
        reviews: true,
        busyDates: true,
        _count: { select: { songs: true } },
      },
    });

    if (!band) {
      return NextResponse.json({ error: 'Band not found' }, { status: 404 });
    }

    return NextResponse.json(band);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch band' }, { status: 500 });
  }
}

export async function PUT(request) {
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();

  if (!id || id === '[id]') {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  try {
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser?.userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true, role: true, bandId: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const canEdit = currentUser.role === 'ADMIN' || currentUser.bandId === id;
    if (!canEdit) {
      return NextResponse.json({ error: 'Nemate dozvolu za izmenu ovog profila.' }, { status: 403 });
    }

    const body = await request.json();
    const name = String(body?.name || '').trim();
    const genre = String(body?.genre || '').trim();
    const location = String(body?.location || '').trim();
    const bio = String(body?.bio || '').trim();
    const img = String(body?.img || '').trim();
    const videoUrl = String(body?.videoUrl || '').trim();
    const priceRange = String(body?.priceRange || '').trim();
    const allowTips =
      body?.allowTips === undefined ? undefined : Boolean(body.allowTips);
    const mediaLimits = await getBandProfileMediaLimits();

    if (!name) {
      return NextResponse.json({ error: 'Naziv benda je obavezan.' }, { status: 400 });
    }

    if (!genre) {
      return NextResponse.json({ error: 'Žanr je obavezan.' }, { status: 400 });
    }

    if (!location) {
      return NextResponse.json({ error: 'Lokacija je obavezna.' }, { status: 400 });
    }

    if (!isAllowedVideoUrl(videoUrl)) {
      return NextResponse.json(
        { error: 'Dozvoljeni su samo YouTube/Vimeo/Cloudinary video linkovi.' },
        { status: 400 }
      );
    }

    if (img && mediaLimits.maxImages < 1) {
      return NextResponse.json(
        { error: 'Dodavanje slike je trenutno onemogućeno od strane administratora.' },
        { status: 400 }
      );
    }

    if (videoUrl && mediaLimits.maxVideos < 1) {
      return NextResponse.json(
        { error: 'Dodavanje videa je trenutno onemogućeno od strane administratora.' },
        { status: 400 }
      );
    }

    const bioLinksCount = countUrlsInText(bio);
    if (bioLinksCount > mediaLimits.maxLinks) {
      return NextResponse.json(
        {
          error: `Opis sadrži previše linkova (${bioLinksCount}/${mediaLimits.maxLinks}). Smanjite broj URL-ova u opisu.`,
        },
        { status: 400 }
      );
    }

    const updatedBand = await prisma.band.upsert({
      where: { id },
      update: {
        name,
        genre,
        location,
        bio: bio || null,
        img: img || null,
        videoUrl: videoUrl || null,
        priceRange: priceRange || null,
        ...(allowTips !== undefined ? { allowTips } : {}),
      },
      create: {
        id,
        name,
        genre,
        location,
        bio: bio || null,
        img: img || null,
        videoUrl: videoUrl || null,
        priceRange: priceRange || null,
        allowTips: allowTips !== undefined ? allowTips : true,
      },
    });

    return NextResponse.json(updatedBand);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to update band' }, { status: 500 });
  }
}
