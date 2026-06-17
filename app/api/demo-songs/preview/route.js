import prisma from '../../../../lib/prisma';
import { getSupabaseAdmin } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return new Response('Nedostaje ID.', { status: 400 });

    const song = await prisma.demoSong.findUnique({
      where: { id },
      select: { previewPath: true },
    });

    if (!song?.previewPath) {
      return new Response('Preview nije dostupan.', { status: 404 });
    }

    // Download the audio file from Supabase server-side and stream it to the client.
    // This avoids all CSP/CORS issues with external Supabase URLs in Audio elements.
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from('demo-songs')
      .download(song.previewPath);

    if (error || !data) {
      console.error('[demo-songs/preview] download error:', error);
      return new Response('Greška pri učitavanju audio fajla.', { status: 500 });
    }

    const arrayBuffer = await data.arrayBuffer();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(arrayBuffer.byteLength),
        'Cache-Control': 'private, no-store',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (err) {
    console.error('[demo-songs/preview]', err);
    return new Response('Greška.', { status: 500 });
  }
}
