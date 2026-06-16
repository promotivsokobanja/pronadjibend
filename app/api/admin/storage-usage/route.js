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
    const bucketNames = ['demo-songs', 'midi', 'audio', 'midi-files', 'avatars', 'band-photos', 'band-images', 'band-videos'];
    const results = [];
    let totalBytes = 0;

    // Fast scan — only top level + 1 subfolder level, count pages for estimation
    async function scanBucket(bucketName) {
      let size = 0;
      let count = 0;

      const { data: topLevel, error } = await supabase.storage.from(bucketName).list('', { limit: 1000 });
      if (error) return { size: 0, count: 0, error: error.message };
      if (!topLevel || topLevel.length === 0) return { size: 0, count: 0 };

      for (const item of topLevel) {
        if (item.metadata && item.metadata.size) {
          size += item.metadata.size;
          count++;
        } else if (!item.metadata || item.id === null) {
          // Folder — scan inside (1 level only, paginated)
          let offset = 0;
          let hasMore = true;
          while (hasMore) {
            const { data: inner } = await supabase.storage.from(bucketName).list(item.name, { limit: 1000, offset });
            if (!inner || inner.length === 0) break;
            for (const f of inner) {
              if (f.metadata && f.metadata.size) {
                size += f.metadata.size;
                count++;
              }
            }
            hasMore = inner.length === 1000;
            offset += 1000;
          }
        }
      }

      return { size, count };
    }

    for (const bucket of bucketNames) {
      const result = await scanBucket(bucket);
      if (result.error) {
        results.push({ bucket, files: 0, bytes: 0, error: result.error });
      } else {
        totalBytes += result.size;
        results.push({ bucket, files: result.count, bytes: result.size });
      }
    }

    const limitBytes = 1024 * 1024 * 1024; // 1 GB free plan
    const validBuckets = results.filter(b => !b.error && b.files > 0);

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
