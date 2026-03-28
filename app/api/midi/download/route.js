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
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    return user;
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

    if (user.plan !== 'PREMIUM') {
      return NextResponse.json(
        { error: 'MIDI biblioteka je dostupna samo PREMIUM članovima.' },
        { status: 403 }
      );
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

    const { data, error } = await supabase.storage
      .from('midi')
      .createSignedUrl(midiFile.filePath, 60);

    if (error) {
      console.error('Supabase signed URL error:', error);
      return NextResponse.json({ error: 'Greška pri generisanju linka.' }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl, fileName: midiFile.fileName });
  } catch (error) {
    console.error('MIDI Download Error:', error);
    return NextResponse.json({ error: 'Greška.' }, { status: 500 });
  }
}
