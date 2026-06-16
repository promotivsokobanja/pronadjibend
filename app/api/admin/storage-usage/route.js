import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { getAuthUserFromRequest } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

async function requireAdmin(request) {
  const auth = await getAuthUserFromRequest(request);
  if (!auth?.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, role: true },
  });
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Nemate dozvolu.' }, { status: 403 });

  try {
    const supabase = getSupabaseAdmin();
    const buckets = ['demo-songs', 'midi', 'audio', 'midi-files', 'avatars', 'band-photos', 'band-images', 'band-videos'];
    const results = [];
    let totalBytes = 0;

    // Recursive function to list all files in a bucket
    async function listAllFiles(bucketName, folder = '') {
      let size = 0;
      let count = 0;
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase.storage.from(bucketName).list(folder, { limit: pageSize, offset });
        if (error || !data || data.length === 0) break;

        for (const item of data) {
          if (item.metadata && item.metadata.size) {
            size += item.metadata.size;
            count++;
          } else if (item.id === null || !item.metadata) {
            // It's a folder — recurse
            const subPath = folder ? `${folder}/${item.name}` : item.name;
            const sub = await listAllFiles(bucketName, subPath);
            size += sub.size;
            count += sub.count;
          }
        }

        hasMore = data.length === pageSize;
        offset += pageSize;
      }

      return { size, count };
    }

    for (const bucket of buckets) {
      const { data: check, error } = await supabase.storage.from(bucket).list('', { limit: 1 });
      if (error) {
        results.push({ bucket, files: 0, bytes: 0, error: error.message });
        continue;
      }

      const { size, count } = await listAllFiles(bucket);
      totalBytes += size;
      results.push({ bucket, files: count, bytes: size });
    }

    const limitBytes = 1024 * 1024 * 1024; // 1 GB free plan

    // Only show buckets that have files or exist
    const validBuckets = results.filter(b => !b.error || b.files > 0);

    return NextResponse.json({
      buckets: validBuckets,
      totalBytes,
      limitBytes,
      usedPercent: Math.round((totalBytes / limitBytes) * 100 * 10) / 10,
    });
  } catch (err) {
    console.error('[admin/storage-usage]', err);
    return NextResponse.json({ error: 'Greška.' }, { status: 500 });
  }
}
