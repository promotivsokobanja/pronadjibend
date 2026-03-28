import prisma from '../../../../lib/prisma';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

async function getUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value || cookieStore.get('auth-token')?.value;
    if (!token) return null;
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    const decoded = jwt.verify(token, secret);
    return await prisma.user.findUnique({ where: { id: decoded.userId } });
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Morate biti prijavljeni.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json({ error: 'Nedostaje ID fajla.' }, { status: 400 });
    }

    const midiFile = await prisma.midiFile.findUnique({ where: { id: fileId } });

    if (!midiFile) {
      return NextResponse.json({ error: 'Fajl nije pronađen.' }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    const bucket = midiFile.fileType === 'audio' ? 'audio' : 'midi';

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(midiFile.filePath, 120);

    if (error) {
      console.error('Supabase preview URL error:', error);
      return NextResponse.json({ error: 'Greška pri generisanju linka.' }, { status: 500 });
    }

    return NextResponse.json({
      url: data.signedUrl,
      fileName: midiFile.fileName,
      fileType: midiFile.fileType || 'midi',
      title: midiFile.title,
      artist: midiFile.artist,
    });
  } catch (error) {
    console.error('MIDI Preview Error:', error);
    return NextResponse.json({ error: 'Greška.' }, { status: 500 });
  }
}
