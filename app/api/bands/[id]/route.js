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

    if (!band || band.deletedAt) {
      return NextResponse.json({ error: 'Band not found' }, { status: 404 });
    }

    // Increment profile views (fire-and-forget, safe if column doesn't exist yet)
    try { prisma.band.update({ where: { id }, data: { profileViews: { increment: 1 } } }).catch(() => {}); } catch {};

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
    const showRepertoire =
      body?.showRepertoire === undefined ? undefined : Boolean(body.showRepertoire);
    const allowFullRepertoireLive =
      body?.allowFullRepertoireLive === undefined ? undefined : Boolean(body.allowFullRepertoireLive);

    // Gallery: validate JSON array of URLs, max 8
    let galleryJson = undefined;
    if (body?.galleryJson !== undefined) {
      try {
        const parsed = JSON.parse(body.galleryJson || '[]');
        if (Array.isArray(parsed) && parsed.length <= 8) {
          galleryJson = JSON.stringify(parsed.filter((u) => typeof u === 'string' && u.trim()));
        }
      } catch {
        galleryJson = '[]';
      }
    }

    // Packages: validate JSON array of {name, description, priceEur}, max 10
    let packagesJson = undefined;
    if (body?.packagesJson !== undefined) {
      try {
        const parsed = JSON.parse(body.packagesJson || '[]');
        if (Array.isArray(parsed) && parsed.length <= 10) {
          packagesJson = JSON.stringify(
            parsed.filter((p) => p && typeof p.name === 'string' && p.name.trim())
              .map((p) => ({ name: p.name.trim(), description: (p.description || '').trim(), priceEur: p.priceEur || '' }))
          );
        }
      } catch {
        packagesJson = '[]';
      }
    }

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
        ...(allowTips !== undefined ? { allowTips } : {}),
        ...(showRepertoire !== undefined ? { showRepertoire } : {}),
        ...(allowFullRepertoireLive !== undefined ? { allowFullRepertoireLive } : {}),
        ...(galleryJson !== undefined ? { galleryJson } : {}),
        ...(packagesJson !== undefined ? { packagesJson } : {}),
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
        ...(galleryJson !== undefined ? { galleryJson } : {}),
        ...(packagesJson !== undefined ? { packagesJson } : {}),
      },
    });

    return NextResponse.json(updatedBand);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to update band' }, { status: 500 });
  }
}
