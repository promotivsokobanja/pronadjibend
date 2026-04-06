import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { requireAdmin } from '../../../../lib/adminAuth';
import { responseFromDatabaseError } from '../../../../lib/dbClientErrors';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 50;

export async function GET(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') || '25', 10) || 25)
  );
  const search = String(searchParams.get('search') || '').trim();
  const category = String(searchParams.get('category') || '').trim();
  const skip = (page - 1) * limit;

  const where = { bandId: null };

  if (category && category !== 'Sve') {
    where.category = category;
  }

  if (search.length >= 2) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { artist: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [total, songs] = await Promise.all([
      prisma.song.count({ where }),
      prisma.song.findMany({
        where,
        select: {
          id: true,
          title: true,
          artist: true,
          category: true,
          type: true,
          key: true,
          lyrics: true,
        },
        orderBy: { title: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    const rows = songs.map((s) => {
      const t = s.lyrics?.trim() || '';
      return {
        id: s.id,
        title: s.title,
        artist: s.artist,
        category: s.category,
        type: s.type,
        key: s.key,
        hasLyrics: Boolean(t),
        lyricsPreview: t ? `${t.slice(0, 80)}${t.length > 80 ? '…' : ''}` : '',
      };
    });

    return NextResponse.json({
      songs: rows,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error('admin pesmarica GET', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri učitavanju.' }, { status: 500 });
  }
}

export async function POST(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();

    if (Array.isArray(body.songs)) {
      const prepared = body.songs
        .map((row) => {
          const title = String(row?.title || '').trim();
          const artist = String(row?.artist || '').trim();
          const lyrics = row?.lyrics != null ? String(row.lyrics).trim() : '';
          const chords = row?.chords != null ? String(row.chords).trim() : '';
          const key = row?.key != null ? String(row.key).trim() : '';
          const category = row?.category != null ? String(row.category).trim() : '';
          const type = row?.type != null ? String(row.type).trim() : '';
          if (!title || !artist || !lyrics) return null;
          return {
            title,
            artist,
            lyrics,
            chords: chords || null,
            key: key || null,
            category: category || null,
            type: type || null,
            bandId: null,
          };
        })
        .filter(Boolean);

      if (prepared.length === 0) {
        return NextResponse.json(
          { error: 'Nijedna pesma nije validna. Potrebni su naslov, izvođač i tekst.' },
          { status: 400 }
        );
      }

      await prisma.song.createMany({ data: prepared });
      return NextResponse.json({ success: true, created: prepared.length });
    }

    const title = String(body.title || '').trim();
    const artist = String(body.artist || '').trim();
    const lyrics = body.lyrics != null ? String(body.lyrics).trim() : '';
    const chords = body.chords != null ? String(body.chords).trim() : '';
    const key = body.key != null ? String(body.key).trim() : '';
    const category = body.category != null ? String(body.category).trim() : '';
    const type = body.type != null ? String(body.type).trim() : '';

    if (!title || !artist) {
      return NextResponse.json({ error: 'Naslov i izvođač su obavezni.' }, { status: 400 });
    }
    if (!lyrics) {
      return NextResponse.json(
        { error: 'Tekst pesme je obavezan da bi se pojavila u javnoj pesmarici.' },
        { status: 400 }
      );
    }

    const song = await prisma.song.create({
      data: {
        title,
        artist,
        lyrics,
        chords: chords || null,
        key: key || null,
        category: category || null,
        type: type || null,
        bandId: null,
      },
    });

    return NextResponse.json({ success: true, song });
  } catch (error) {
    console.error('admin pesmarica POST', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return safe;
    return NextResponse.json({ error: 'Greška pri čuvanju pesme.' }, { status: 500 });
  }
}
