import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';
import { ensureSongOwnership } from '../../../../lib/songOwner';

export const dynamic = 'force-dynamic';

async function loadSongOr404(id) {
  const song = await prisma.song.findUnique({ where: { id: id.toString() } });
  if (!song) return null;
  return song;
}

export async function GET(request, { params } = {}) {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  try {
    const song = await loadSongOr404(id);
    if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 });

    const { error } = await ensureSongOwnership(request, song);
    if (error) return error;

    return NextResponse.json(song);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch song' }, { status: 500 });
  }
}

export async function PATCH(request, { params } = {}) {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  try {
    const body = await request.json();
    const song = await loadSongOr404(id);
    if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 });

    const { error } = await ensureSongOwnership(request, song);
    if (error) return error;

    const updated = await prisma.song.update({
      where: { id: song.id },
      data: {
        lyrics: body.lyrics,
        chords: body.chords,
        title: body.title,
        artist: body.artist,
        category: body.category ?? song.category,
        type: body.type ?? song.type,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to update song' }, { status: 500 });
  }
}

export async function DELETE(request, { params } = {}) {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  try {
    const song = await loadSongOr404(id);
    if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 });

    const { error } = await ensureSongOwnership(request, song);
    if (error) return error;

    await prisma.$transaction([
      prisma.liveRequest.updateMany({
        where: { songId: song.id },
        data: { songId: null },
      }),
      prisma.setListItem.deleteMany({
        where: { songId: song.id },
      }),
      prisma.song.delete({ where: { id: song.id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to delete song' }, { status: 500 });
  }
}
