import prisma from '../../../../lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params } = {}) {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  try {
    const song = await prisma.song.findUnique({ where: { id: id.toString() } });
    if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 });
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
    const song = await prisma.song.update({
      where: { id: id.toString() },
      data: { lyrics: body.lyrics, chords: body.chords, title: body.title, artist: body.artist },
    });
    return NextResponse.json(song);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to update song' }, { status: 500 });
  }
}
