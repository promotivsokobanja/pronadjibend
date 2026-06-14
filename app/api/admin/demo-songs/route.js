import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../../lib/auth';
import { getSupabaseAdmin } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

async function requireAdmin(request) {
  const auth = await getAuthUserFromRequest(request);
  if (!auth?.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, role: true },
  });
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Nemate dozvolu.' }, { status: 403 });

  try {
    const songs = await prisma.demoSong.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(songs);
  } catch (err) {
    console.error('[admin/demo-songs GET]', err);
    return NextResponse.json({ error: 'Greška.' }, { status: 500 });
  }
}

export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Nemate dozvolu.' }, { status: 403 });

  try {
    const formData = await request.formData();
    const title = formData.get('title') || '';
    const artist = formData.get('artist') || '';
    const category = formData.get('category') || '';
    const description = formData.get('description') || '';
    const driveLink = formData.get('driveLink') || '';
    const price = formData.get('price') || '';
    const file = formData.get('file');

    if (!title.trim() || !artist.trim()) {
      return NextResponse.json({ error: 'Naziv i izvođač su obavezni.' }, { status: 400 });
    }

    let previewPath = null;
    let previewDuration = null;

    if (file && file.size > 0) {
      const fileName = file.name;
      if (!/\.(mp3|wav|ogg|m4a|aac)$/i.test(fileName)) {
        return NextResponse.json({ error: 'Dozvoljeni formati: mp3, wav, ogg, m4a, aac' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const storagePath = `demos/${safeName}`;

      const supabase = getSupabaseAdmin();
      await supabase.storage.createBucket('demo-songs', {
        public: false,
        fileSizeLimit: 52428800,
      }).catch(() => {});

      const { error: uploadError } = await supabase.storage
        .from('demo-songs')
        .upload(storagePath, buffer, { contentType: file.type || 'audio/mpeg', upsert: true });

      if (uploadError) {
        console.error('Demo upload error:', uploadError);
        return NextResponse.json({ error: 'Greška pri uploadu: ' + uploadError.message }, { status: 500 });
      }

      previewPath = storagePath;

      const durationRaw = formData.get('previewDuration');
      if (durationRaw) {
        const d = parseInt(durationRaw, 10);
        if (!Number.isNaN(d) && d > 0) previewDuration = d;
      }
    }

    const allowDownload = formData.get('allowDownload') === 'true';

    const song = await prisma.demoSong.create({
      data: {
        title: title.trim(),
        artist: artist.trim(),
        category: category.trim() || null,
        description: description.trim() || null,
        previewPath,
        previewDuration,
        driveLink: driveLink.trim() || null,
        allowDownload,
        price: price.trim() || null,
      },
    });

    return NextResponse.json(song);
  } catch (err) {
    console.error('[admin/demo-songs POST]', err);
    return NextResponse.json({ error: 'Greška na serveru.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Nemate dozvolu.' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Nedostaje ID.' }, { status: 400 });

    const song = await prisma.demoSong.findUnique({ where: { id } });
    if (!song) return NextResponse.json({ error: 'Nije pronađeno.' }, { status: 404 });

    if (song.previewPath) {
      const supabase = getSupabaseAdmin();
      await supabase.storage.from('demo-songs').remove([song.previewPath]).catch(() => {});
    }

    await prisma.demoSong.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/demo-songs DELETE]', err);
    return NextResponse.json({ error: 'Greška.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Nemate dozvolu.' }, { status: 403 });

  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'Nedostaje ID.' }, { status: 400 });

    const existing = await prisma.demoSong.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Nije pronađeno.' }, { status: 404 });

    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.artist !== undefined) updateData.artist = data.artist.trim();
    if (data.category !== undefined) updateData.category = data.category.trim() || null;
    if (data.description !== undefined) updateData.description = data.description.trim() || null;
    if (data.driveLink !== undefined) updateData.driveLink = data.driveLink.trim() || null;
    if (data.price !== undefined) updateData.price = data.price.trim() || null;
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
    if (data.allowDownload !== undefined) updateData.allowDownload = Boolean(data.allowDownload);

    const updated = await prisma.demoSong.update({ where: { id }, data: updateData });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[admin/demo-songs PATCH]', err);
    return NextResponse.json({ error: 'Greška.' }, { status: 500 });
  }
}
