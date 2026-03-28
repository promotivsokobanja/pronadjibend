import prisma from '../../../../lib/prisma';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

async function getUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await prisma.user.findUnique({ where: { id: decoded.userId } });
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const user = await getUser();

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Samo administrator može dodavati fajlove.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const title = formData.get('title') || '';
    const artist = formData.get('artist') || '';
    const category = formData.get('category') || 'Zabavna';

    if (!file) {
      return NextResponse.json({ error: 'Fajl je obavezan.' }, { status: 400 });
    }

    const fileName = file.name;
    const isMidi = /\.(mid|kar)$/i.test(fileName);
    const isAudio = /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(fileName);

    if (!isMidi && !isAudio) {
      return NextResponse.json(
        { error: 'Dozvoljeni formati: .mid, .kar, .mp3, .wav, .ogg, .aac, .flac, .m4a' },
        { status: 400 }
      );
    }

    const fileType = isMidi ? 'midi' : 'audio';
    const bucket = isMidi ? 'midi' : 'audio';
    const contentType = isMidi ? 'audio/midi' : file.type || 'audio/mpeg';

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${category}/${safeName}`;

    const supabase = getSupabaseAdmin();

    await supabase.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: 52428800,
    }).catch(() => {});

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Greška pri uploadu: ' + uploadError.message }, { status: 500 });
    }

    const record = await prisma.midiFile.create({
      data: {
        title: title || fileName.replace(/\.(mid|kar|mp3|wav|ogg|aac|flac|m4a)$/i, ''),
        artist: artist || 'Nepoznat',
        category,
        fileName,
        filePath: storagePath,
        fileSize: buffer.length,
        fileType,
        uploadedBy: user.id,
      },
    });

    return NextResponse.json({ success: true, file: record });
  } catch (error) {
    console.error('Upload API Error:', error);
    return NextResponse.json({ error: 'Greška na serveru.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getUser();

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Samo administrator.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Nedostaje ID.' }, { status: 400 });
    }

    const file = await prisma.midiFile.findUnique({ where: { id } });
    if (!file) {
      return NextResponse.json({ error: 'Fajl nije pronađen.' }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    const bucket = file.fileType === 'audio' ? 'audio' : 'midi';

    await supabase.storage.from(bucket).remove([file.filePath]);
    await prisma.midiFile.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete API Error:', error);
    return NextResponse.json({ error: 'Greška.' }, { status: 500 });
  }
}
