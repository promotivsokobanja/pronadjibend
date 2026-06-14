import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const songs = await prisma.demoSong.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        artist: true,
        category: true,
        description: true,
        previewDuration: true,
        allowDownload: true,
        price: true,
        createdAt: true,
        previewPath: true,
      },
    });

    const mapped = songs.map((s) => ({
      ...s,
      hasPreview: Boolean(s.previewPath),
      previewPath: undefined,
    }));

    return NextResponse.json(mapped);
  } catch (err) {
    console.error('[demo-songs GET]', err);
    return NextResponse.json({ error: 'Greška.' }, { status: 500 });
  }
}
