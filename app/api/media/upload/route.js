import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getAuthUserFromRequest } from '../../../../lib/auth';
import { getSupabaseAdmin } from '../../../../lib/supabase';

const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 100 * 1024 * 1024;

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const ALLOWED_VIDEO_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

function isSupabaseConfigured() {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request) {
  try {
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser?.userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Media servis nije konfigurisan.' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const kind = String(formData.get('kind') || 'image');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Fajl je obavezan.' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const mimeType = String(file.type || '');

    if (kind === 'image') {
      if (!ALLOWED_IMAGE_MIME.has(mimeType)) {
        return NextResponse.json(
          { error: 'Dozvoljene su samo JPEG, PNG, WebP ili GIF slike.' },
          { status: 400 }
        );
      }
      if (fileBuffer.byteLength > IMAGE_MAX_BYTES) {
        return NextResponse.json(
          { error: 'Slika je prevelika (max 10MB).' },
          { status: 400 }
        );
      }

      const optimized = await sharp(fileBuffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const supabase = getSupabaseAdmin();
      const fileName = `bands/${authUser.userId}-${Date.now()}.webp`;

      const { data, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, optimized, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return NextResponse.json(
          { error: 'Greška pri upload-u slike.' },
          { status: 500 }
        );
      }

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      return NextResponse.json({
        url: urlData.publicUrl,
        path: data.path,
        bytes: optimized.byteLength,
      });
    }

    if (kind === 'video') {
      if (!ALLOWED_VIDEO_MIME.has(mimeType)) {
        return NextResponse.json(
          { error: 'Dozvoljeni su samo MP4, WebM ili QuickTime video fajlovi.' },
          { status: 400 }
        );
      }
      if (fileBuffer.byteLength > VIDEO_MAX_BYTES) {
        return NextResponse.json(
          { error: 'Video je prevelik (max 100MB).' },
          { status: 400 }
        );
      }

      const supabase = getSupabaseAdmin();
      const ext = mimeType === 'video/mp4' ? 'mp4' : mimeType === 'video/webm' ? 'webm' : 'mov';
      const fileName = `bands/${authUser.userId}-${Date.now()}.${ext}`;

      const { data, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Supabase video upload error:', uploadError);
        return NextResponse.json(
          { error: 'Greška pri upload-u videa.' },
          { status: 500 }
        );
      }

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      return NextResponse.json({
        url: urlData.publicUrl,
        path: data.path,
        bytes: fileBuffer.byteLength,
      });
    }

    return NextResponse.json({ error: 'Nepoznat tip fajla.' }, { status: 400 });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { error: 'Greška pri upload-u materijala.' },
      { status: 500 }
    );
  }
}
