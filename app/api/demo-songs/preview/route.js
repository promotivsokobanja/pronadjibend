import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { getAuthUserFromRequest } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Nedostaje ID.' }, { status: 400 });

    // Check if user is admin (can preview inactive songs too)
    let isAdmin = false;
    try {
      const auth = await getAuthUserFromRequest(request);
      if (auth?.userId) {
        const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { role: true } });
        if (user?.role === 'ADMIN') isAdmin = true;
      }
    } catch { /* not logged in, that's ok */ }

    const song = await prisma.demoSong.findUnique({
      where: { id },
      select: { previewPath: true, isActive: true },
    });

    if (!song || !song.previewPath) {
      return NextResponse.json({ error: 'Preview nije dostupan.' }, { status: 404 });
    }
    if (!song.isActive && !isAdmin) {
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
