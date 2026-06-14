import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getSupabaseAdmin } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Nedostaje ID.' }, { status: 400 });

    const song = await prisma.demoSong.findUnique({
      where: { id },
      select: { previewPath: true, isActive: true },
    });

    if (!song || !song.isActive || !song.previewPath) {
      return NextResponse.json({ error: 'Preview nije dostupan.' }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from('demo-songs')
      .createSignedUrl(song.previewPath, 300); // 5 min signed URL

    if (error || !data?.signedUrl) {
      console.error('[demo-songs/preview] signed URL error:', error);
      return NextResponse.json({ error: 'Greška pri generisanju linka.' }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (err) {
    console.error('[demo-songs/preview]', err);
    return NextResponse.json({ error: 'Greška.' }, { status: 500 });
  }
}
