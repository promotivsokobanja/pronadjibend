import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { requireAdmin } from '../../../../../lib/adminAuth';
import { responseFromDatabaseError } from '../../../../../lib/dbClientErrors';

export const dynamic = 'force-dynamic';

async function getGlobalSong(id) {
  return prisma.song.findFirst({
    where: { id, bandId: null },
  });
}

export async function GET(request, { params }) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { id } = params;
  try {
    const song = await getGlobalSong(id);
    if (!song) {
      return NextResponse.json({ error: 'Pesma nije pronađena.' }, { status: 404 });
    }
    return NextResponse.json({ song });
  } catch (error) {
    console.error('admin pesmarica [id] GET', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri učitavanju.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { id } = params;
  try {
    const existing = await getGlobalSong(id);
    if (!existing) {
      return NextResponse.json({ error: 'Pesma nije pronađena.' }, { status: 404 });
    }

    const body = await request.json();
    const title = body.title != null ? String(body.title).trim() : existing.title;
    const artist = body.artist != null ? String(body.artist).trim() : existing.artist;
    const lyrics =
      body.lyrics !== undefined
        ? body.lyrics === null
          ? null
          : String(body.lyrics).trim() || null
        : existing.lyrics;
    const chords =
      body.chords !== undefined
        ? body.chords === null || body.chords === ''
          ? null
          : String(body.chords).trim()
        : existing.chords;
    const key =
      body.key !== undefined
        ? body.key === null || body.key === ''
          ? null
          : String(body.key).trim()
        : existing.key;
    const category =
      body.category !== undefined
        ? body.category === null || body.category === ''
          ? null
          : String(body.category).trim()
        : existing.category;
    const type =
      body.type !== undefined
        ? body.type === null || body.type === ''
          ? null
          : String(body.type).trim()
        : existing.type;

    if (!title || !artist) {
      return NextResponse.json({ error: 'Naslov i izvođač su obavezni.' }, { status: 400 });
    }

    const song = await prisma.song.update({
      where: { id },
      data: {
        title,
        artist,
        lyrics,
        chords,
        key,
        category,
        type,
        bandId: null,
      },
    });

    return NextResponse.json({ success: true, song });
  } catch (error) {
    console.error('admin pesmarica PATCH', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri ažuriranju.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { id } = params;
  try {
    const existing = await getGlobalSong(id);
    if (!existing) {
      return NextResponse.json({ error: 'Pesma nije pronađena.' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.liveRequest.deleteMany({ where: { songId: id } }),
      prisma.song.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('admin pesmarica DELETE', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri brisanju.' }, { status: 500 });
  }
}
