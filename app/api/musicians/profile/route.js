import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth';

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

function normalizeBody(body) {
  const name = String(body?.name || '').trim();
  const primaryInstrument = String(body?.primaryInstrument || '').trim();
  const genres = String(body?.genres || '').trim();
  const city = String(body?.city || '').trim();
  const bio = String(body?.bio || '').trim();
  const img = String(body?.img || '').trim();
  const videoUrl = String(body?.videoUrl || '').trim();
  const priceFromEur = body?.priceFromEur === '' || body?.priceFromEur == null ? null : Number(body.priceFromEur);
  const priceToEur = body?.priceToEur === '' || body?.priceToEur == null ? null : Number(body.priceToEur);
  const experienceYears =
    body?.experienceYears === '' || body?.experienceYears == null ? null : Number(body.experienceYears);

  return {
    name,
    primaryInstrument,
    genres,
    city,
    bio,
    img,
    videoUrl,
    priceFromEur: Number.isFinite(priceFromEur) ? Math.max(0, Math.floor(priceFromEur)) : null,
    priceToEur: Number.isFinite(priceToEur) ? Math.max(0, Math.floor(priceToEur)) : null,
    experienceYears: Number.isFinite(experienceYears) ? Math.max(0, Math.floor(experienceYears)) : null,
    isAvailable: body?.isAvailable !== false,
    allowTips: body?.allowTips === undefined ? undefined : Boolean(body.allowTips),
    showRepertoire: body?.showRepertoire === undefined ? undefined : Boolean(body.showRepertoire),
    allowFullRepertoireLive: body?.allowFullRepertoireLive === undefined ? undefined : Boolean(body.allowFullRepertoireLive),
  };
}

async function resolveCurrentUser(request) {
  const authUser = await getAuthUserFromRequest(request);
  if (!authUser?.userId) return null;

  return prisma.user.findUnique({
    where: { id: authUser.userId },
    select: {
      id: true,
      role: true,
      bandId: true,
      musicianProfile: {
        select: {
          id: true,
          userId: true,
          name: true,
          primaryInstrument: true,
          genres: true,
          city: true,
          priceFromEur: true,
          priceToEur: true,
          experienceYears: true,
          bio: true,
          img: true,
          videoUrl: true,
          rating: true,
          isFeatured: true,
          isAvailable: true,
          allowTips: true,
          showRepertoire: true,
          allowFullRepertoireLive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

export async function GET(request) {
  try {
    const user = await resolveCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    if (user.bandId) {
      return NextResponse.json(
        { error: 'Bend nalozi ne uređuju muzičarski profil na ovoj ruti.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ profile: user.musicianProfile || null });
  } catch (error) {
    console.error('Musician profile GET error:', error);
    return NextResponse.json({ error: 'Greška pri čitanju profila.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = await resolveCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    if (user.bandId) {
      return NextResponse.json(
        { error: 'Bend nalozi ne uređuju muzičarski profil na ovoj ruti.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const payload = normalizeBody(body);

    if (!payload.name) {
      return NextResponse.json({ error: 'Ime je obavezno.' }, { status: 400 });
    }

    if (!payload.primaryInstrument) {
      return NextResponse.json({ error: 'Primarni instrument je obavezan.' }, { status: 400 });
    }

    if (!payload.city) {
      return NextResponse.json({ error: 'Grad je obavezan.' }, { status: 400 });
    }

    if (!isAllowedVideoUrl(payload.videoUrl)) {
      return NextResponse.json(
        { error: 'Dozvoljeni su samo YouTube/Vimeo/Cloudinary video linkovi.' },
        { status: 400 }
      );
    }

    if (payload.priceFromEur != null && payload.priceToEur != null && payload.priceToEur < payload.priceFromEur) {
      return NextResponse.json({ error: 'Gornja cena mora biti veća ili jednaka početnoj ceni.' }, { status: 400 });
    }

    const saved = await prisma.musicianProfile.upsert({
      where: { userId: user.id },
      update: {
        name: payload.name,
        primaryInstrument: payload.primaryInstrument,
        genres: payload.genres || null,
        city: payload.city,
        priceFromEur: payload.priceFromEur,
        priceToEur: payload.priceToEur,
        experienceYears: payload.experienceYears,
        bio: payload.bio || null,
        img: payload.img || null,
        videoUrl: payload.videoUrl || null,
        isAvailable: payload.isAvailable,
        ...(payload.allowTips !== undefined ? { allowTips: payload.allowTips } : {}),
        ...(payload.showRepertoire !== undefined ? { showRepertoire: payload.showRepertoire } : {}),
        ...(payload.allowFullRepertoireLive !== undefined ? { allowFullRepertoireLive: payload.allowFullRepertoireLive } : {}),
      },
      create: {
        userId: user.id,
        name: payload.name,
        primaryInstrument: payload.primaryInstrument,
        genres: payload.genres || null,
        city: payload.city,
        priceFromEur: payload.priceFromEur,
        priceToEur: payload.priceToEur,
        experienceYears: payload.experienceYears,
        bio: payload.bio || null,
        img: payload.img || null,
        videoUrl: payload.videoUrl || null,
        isAvailable: payload.isAvailable,
        allowTips: payload.allowTips !== undefined ? payload.allowTips : true,
        showRepertoire: payload.showRepertoire === true,
        allowFullRepertoireLive: payload.allowFullRepertoireLive === true,
      },
    });

    return NextResponse.json({ success: true, profile: saved });
  } catch (error) {
    console.error('Musician profile PUT error:', error);
    return NextResponse.json({ error: 'Greška pri čuvanju profila.' }, { status: 500 });
  }
}
