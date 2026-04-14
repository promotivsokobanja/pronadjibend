import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

/** Resolve owner (bandId / musicianProfileId) from authenticated user */
async function resolveOwner(request) {
  const auth = await getAuthUserFromRequest(request);
  if (!auth?.userId) return { error: NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 }) };

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, role: true, bandId: true, musicianProfile: { select: { id: true } } },
  });
  if (!user) return { error: NextResponse.json({ error: 'Nalog ne postoji.' }, { status: 401 }) };

  if (user.bandId) return { owner: { bandId: user.bandId, musicianProfileId: null }, user };
  if (user.musicianProfile?.id) return { owner: { bandId: null, musicianProfileId: user.musicianProfile.id }, user };
  if (user.role === 'ADMIN') return { owner: null, user };
  return { error: NextResponse.json({ error: 'Profil nije povezan sa bendom niti muzičarem.' }, { status: 403 }) };
}

// GET /api/setlists?bandId=X or ?musicianId=X
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bandId = searchParams.get('bandId');
    const musicianId = searchParams.get('musicianId');

    const where = {};
    if (bandId) where.bandId = bandId;
    else if (musicianId) where.musicianProfileId = musicianId;
    else return NextResponse.json({ error: 'bandId ili musicianId je obavezan.' }, { status: 400 });

    const setLists = await prisma.setList.findMany({
      where,
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: { song: { select: { id: true, title: true, artist: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(setLists);
  } catch (err) {
    console.error('GET /api/setlists error:', err);
    return NextResponse.json({ error: 'Greška pri učitavanju set listi.' }, { status: 500 });
  }
}

// POST /api/setlists — create a new setlist
export async function POST(request) {
  try {
    const { owner, error } = await resolveOwner(request);
    if (error) return error;
    if (!owner) return NextResponse.json({ error: 'Admin mora imati bend/muzičar profil.' }, { status: 400 });

    const body = await request.json();
    const name = String(body.name || '').trim() || 'Nova set lista';

    const setList = await prisma.setList.create({
      data: {
        name,
        bandId: owner.bandId,
        musicianProfileId: owner.musicianProfileId,
      },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: { song: { select: { id: true, title: true, artist: true } } },
        },
      },
    });

    return NextResponse.json(setList, { status: 201 });
  } catch (err) {
    console.error('POST /api/setlists error:', err);
    return NextResponse.json({ error: 'Greška pri kreiranju set liste.' }, { status: 500 });
  }
}
