import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '../../../../lib/auth';

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
      },
    });

    return NextResponse.json(updatedBand);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to update band' }, { status: 500 });
  }
}
