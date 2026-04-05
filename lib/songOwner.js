import { NextResponse } from 'next/server';
import prisma from './prisma';
import { getAuthUserFromRequest } from './auth';

async function getSongUser(request) {
  const auth = await getAuthUserFromRequest(request);
  if (!auth?.userId) {
    return { error: NextResponse.json({ error: 'Morate biti prijavljeni.' }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      role: true,
      bandId: true,
      musicianProfile: { select: { id: true } },
    },
  });

  if (!user) {
    return {
      error: NextResponse.json({ error: 'Nalog više ne postoji. Prijavite se ponovo.' }, { status: 401 }),
    };
  }

  return { user };
}

export async function resolveSongOwner(request, overrides = {}) {
  const { user, error } = await getSongUser(request);
  if (error) return { error };

  const bodyBandId = overrides.bandId;
  const bodyMusicianId = overrides.musicianId;

  if (user.role === 'ADMIN') {
    if (bodyBandId) return { owner: { type: 'band', id: bodyBandId }, user };
    if (bodyMusicianId) return { owner: { type: 'musician', id: bodyMusicianId }, user };
    if (user.bandId) return { owner: { type: 'band', id: user.bandId }, user };
    if (user.musicianProfile?.id) return { owner: { type: 'musician', id: user.musicianProfile.id }, user };
    return {
      error: NextResponse.json({ error: 'Navedi bend ili muzičara za dodavanje pesme.' }, { status: 400 }),
    };
  }

  if (user.bandId) {
    if (bodyBandId && bodyBandId !== user.bandId) {
      return { error: NextResponse.json({ error: 'Ne možete dodavati pesme drugom bendu.' }, { status: 403 }) };
    }
    return { owner: { type: 'band', id: user.bandId }, user };
  }

  if (user.musicianProfile?.id) {
    if (bodyMusicianId && bodyMusicianId !== user.musicianProfile.id) {
      return { error: NextResponse.json({ error: 'Ne možete dodavati pesme drugom profilu.' }, { status: 403 }) };
    }
    return { owner: { type: 'musician', id: user.musicianProfile.id }, user };
  }

  return {
    error: NextResponse.json({ error: 'Profil nije povezan ni sa jednim bendom niti muzičarem.' }, { status: 403 }),
  };
}

export async function ensureSongOwnership(request, song) {
  const { user, error } = await getSongUser(request);
  if (error) return { error };

  const isAdmin = user.role === 'ADMIN';
  const ownsBandSong = song.bandId && user.bandId && song.bandId === user.bandId;
  const ownsMusicianSong =
    song.musicianProfileId && user.musicianProfile?.id && song.musicianProfileId === user.musicianProfile.id;

  if (!isAdmin && !ownsBandSong && !ownsMusicianSong) {
    return {
      error: NextResponse.json({ error: 'Nemate dozvolu za upravljanje ovom pesmom.' }, { status: 403 }),
    };
  }

  return { ok: true, user };
}
