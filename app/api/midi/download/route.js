import prisma from '../../../../lib/prisma';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await getAuthUserFromRequest(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Morate biti prijavljeni.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, role: true, plan: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json({ error: 'Morate biti prijavljeni.' }, { status: 401 });
    }

    const plan = String(user.plan || '').toUpperCase();
    const hasPremiumAccess = plan.startsWith('PREMIUM');

    if (!hasPremiumAccess && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Biblioteka je dostupna samo PREMIUM članovima.' },
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
    const bucket = midiFile.fileType === 'audio' ? 'audio' : 'midi';

    const { data, error } = await supabase.storage
      .from(bucket)
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
