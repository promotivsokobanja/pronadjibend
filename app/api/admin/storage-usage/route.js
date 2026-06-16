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
    const buckets = ['demo-songs', 'midi-files', 'avatars', 'band-photos'];
    const results = [];
    let totalBytes = 0;

    for (const bucket of buckets) {
      let bucketSize = 0;
      let fileCount = 0;

      const { data: topLevel, error } = await supabase.storage.from(bucket).list('', { limit: 1000 });
      if (error) {
        results.push({ bucket, files: 0, bytes: 0, error: error.message });
        continue;
      }

      for (const item of (topLevel || [])) {
        if (item.metadata && item.metadata.size) {
          bucketSize += item.metadata.size;
          fileCount++;
        } else if (item.id === null || !item.metadata) {
          // Likely a folder — list contents
          const { data: inner } = await supabase.storage.from(bucket).list(item.name, { limit: 1000 });
          for (const f of (inner || [])) {
            if (f.metadata && f.metadata.size) {
              bucketSize += f.metadata.size;
              fileCount++;
            }
          }
        }
      }

      totalBytes += bucketSize;
      results.push({ bucket, files: fileCount, bytes: bucketSize });
    }

    const limitBytes = 1024 * 1024 * 1024; // 1 GB free plan

    return NextResponse.json({
      buckets: results,
      totalBytes,
      limitBytes,
      usedPercent: Math.round((totalBytes / limitBytes) * 100 * 10) / 10,
    });
  } catch (err) {
    console.error('[admin/storage-usage]', err);
    return NextResponse.json({ error: 'Greška.' }, { status: 500 });
  }
}
