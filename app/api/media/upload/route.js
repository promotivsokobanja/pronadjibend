import { NextResponse } from 'next/server';
import sharp from 'sharp';
import cloudinary from '../../../../lib/cloudinary';
import { getAuthUserFromRequest } from '../../../../lib/auth';

const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 100 * 1024 * 1024;

function isConfigured() {
  return (
    !!process.env.CLOUDINARY_CLOUD_NAME &&
    !!process.env.CLOUDINARY_API_KEY &&
    !!process.env.CLOUDINARY_API_SECRET
  );
}

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

export async function POST(request) {
  try {
    const authUser = await getAuthUserFromRequest(request);
    if (!authUser?.userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    if (!isConfigured()) {
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
      if (!mimeType.startsWith('image/')) {
        return NextResponse.json({ error: 'Dozvoljene su samo slike.' }, { status: 400 });
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

      const uploaded = await uploadBuffer(optimized, {
        resource_type: 'image',
        folder: 'pronadjibend/bands',
        format: 'webp',
      });

      return NextResponse.json({
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        bytes: uploaded.bytes,
      });
    }

    if (kind === 'video') {
      if (!mimeType.startsWith('video/')) {
        return NextResponse.json(
          { error: 'Dozvoljeni su samo video fajlovi.' },
          { status: 400 }
        );
      }
      if (fileBuffer.byteLength > VIDEO_MAX_BYTES) {
        return NextResponse.json(
          { error: 'Video je prevelik (max 100MB).' },
          { status: 400 }
        );
      }

      const uploaded = await uploadBuffer(fileBuffer, {
        resource_type: 'video',
        folder: 'pronadjibend/bands',
      });

      const optimizedUrl = cloudinary.url(uploaded.public_id, {
        resource_type: 'video',
        secure: true,
        fetch_format: 'auto',
        quality: 'auto',
        width: 1280,
        crop: 'limit',
      });

      return NextResponse.json({
        url: optimizedUrl,
        originalUrl: uploaded.secure_url,
        publicId: uploaded.public_id,
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
