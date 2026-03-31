import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { isMediaStorageConfigured, uploadMedia } from '../../../../lib/mediaStorage';
import { transcodeVideoBuffer } from '../../../../lib/videoTranscode';
import { getAuthUserFromRequest } from '../../../../lib/auth';

const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_MAX_DIMENSION = 1280;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

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

export async function POST(request) {
  try {
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser?.userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    if (!isMediaStorageConfigured()) {
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
        .resize({
          width: IMAGE_MAX_DIMENSION,
          height: IMAGE_MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();

      const uploaded = await uploadMedia({
        kind: 'image',
        buffer: optimized,
        mimeType: 'image/webp',
        fileName: file.name,
      });

      return NextResponse.json({
        url: uploaded.url,
        publicId: uploaded.publicId,
        bytes: uploaded.bytes,
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
          { error: 'Video je prevelik (max 50MB).' },
          { status: 400 }
        );
      }

      const transcoded = await transcodeVideoBuffer(fileBuffer, mimeType);

      const uploaded = await uploadMedia({
        kind: 'video',
        buffer: transcoded.buffer,
        mimeType: transcoded.mimeType,
        fileName: transcoded.ext === 'mp4' ? `${file.name.replace(/\.[^/.]+$/, '')}.mp4` : file.name,
      });

      return NextResponse.json({
        url: uploaded.url,
        originalUrl: uploaded.originalUrl || uploaded.url,
        publicId: uploaded.publicId,
        bytes: uploaded.bytes,
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
