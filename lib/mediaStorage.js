import cloudinary from './cloudinary';
import { getSupabaseAdmin } from './supabase';

const DEFAULT_SUPABASE_IMAGES_BUCKET = 'band-images';
const DEFAULT_SUPABASE_VIDEOS_BUCKET = 'band-videos';

function getRequestedProvider() {
  return String(process.env.MEDIA_UPLOAD_PROVIDER || 'supabase').toLowerCase();
}

function isCloudinaryConfigured() {
  return (
    !!process.env.CLOUDINARY_CLOUD_NAME &&
    !!process.env.CLOUDINARY_API_KEY &&
    !!process.env.CLOUDINARY_API_SECRET
  );
}

function isSupabaseConfigured() {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function resolveMediaProvider() {
  const requested = getRequestedProvider();

  if (requested === 'cloudinary') {
    if (isCloudinaryConfigured()) return 'cloudinary';
    if (isSupabaseConfigured()) return 'supabase';
    return 'none';
  }

  if (requested === 'supabase') {
    if (isSupabaseConfigured()) return 'supabase';
    if (isCloudinaryConfigured()) return 'cloudinary';
    return 'none';
  }

  if (isSupabaseConfigured()) return 'supabase';
  if (isCloudinaryConfigured()) return 'cloudinary';
  return 'none';
}

export function isMediaStorageConfigured() {
  return resolveMediaProvider() !== 'none';
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeFileName(fileName) {
  const safe = String(fileName || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
  return safe.length > 0 ? safe : 'upload';
}

function fileExtensionFromMime(mimeType, fallback = 'bin') {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  };
  return map[mimeType] || fallback;
}

function getSupabaseBucket(kind) {
  if (kind === 'video') {
    return process.env.SUPABASE_MEDIA_VIDEOS_BUCKET || DEFAULT_SUPABASE_VIDEOS_BUCKET;
  }
  return process.env.SUPABASE_MEDIA_IMAGES_BUCKET || DEFAULT_SUPABASE_IMAGES_BUCKET;
}

async function ensureBucket(supabase, bucket) {
  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
  });

  if (!error) return;

  const message = String(error.message || '').toLowerCase();
  if (message.includes('already exists') || message.includes('duplicate')) {
    return;
  }

  throw new Error(`Supabase create bucket failed: ${error.message}`);
}

async function uploadToSupabase({ kind, buffer, mimeType, fileName }) {
  const supabase = getSupabaseAdmin();
  const bucket = getSupabaseBucket(kind);
  const safeName = normalizeFileName(fileName);
  const extension = kind === 'image' ? 'webp' : fileExtensionFromMime(mimeType, 'mp4');
  const baseName = safeName.replace(/\.[^/.]+$/, '');
  const storagePath = `pronadjibend/bands/${Date.now()}-${randomId()}-${baseName}.${extension}`;

  let uploadError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

    if (!error) {
      uploadError = null;
      break;
    }

    uploadError = error;
    const message = String(error.message || '').toLowerCase();
    if (attempt === 0 && message.includes('bucket not found')) {
      await ensureBucket(supabase, bucket);
      continue;
    }

    break;
  }

  if (uploadError) {
    throw new Error(`Supabase upload failed: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const publicUrl = publicUrlData?.publicUrl;

  if (!publicUrl) {
    throw new Error('Supabase public URL generation failed.');
  }

  return {
    url: publicUrl,
    originalUrl: publicUrl,
    publicId: `${bucket}/${storagePath}`,
    bytes: buffer.byteLength,
    provider: 'supabase',
  };
}

function uploadBufferToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

async function uploadToCloudinary({ kind, buffer }) {
  if (kind === 'image') {
    const uploaded = await uploadBufferToCloudinary(buffer, {
      resource_type: 'image',
      folder: 'pronadjibend/bands',
      format: 'webp',
    });

    return {
      url: uploaded.secure_url,
      originalUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
      bytes: uploaded.bytes,
      provider: 'cloudinary',
    };
  }

  const uploaded = await uploadBufferToCloudinary(buffer, {
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

  return {
    url: optimizedUrl,
    originalUrl: uploaded.secure_url,
    publicId: uploaded.public_id,
    bytes: uploaded.bytes,
    provider: 'cloudinary',
  };
}

export async function uploadMedia({ kind, buffer, mimeType, fileName }) {
  const provider = resolveMediaProvider();

  if (provider === 'supabase') {
    return uploadToSupabase({ kind, buffer, mimeType, fileName });
  }

  if (provider === 'cloudinary') {
    return uploadToCloudinary({ kind, buffer, mimeType, fileName });
  }

  throw new Error('Media storage provider is not configured.');
}
