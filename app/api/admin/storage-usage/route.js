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
    const bucketNames = ['demo-songs', 'midi', 'audio', 'avatars', 'band-photos', 'band-images', 'band-videos'];

    // Scan a single folder (paginated)
    async function listFolder(bucket, folder) {
      let size = 0, count = 0, offset = 0;
      while (true) {
        const { data } = await supabase.storage.from(bucket).list(folder, { limit: 1000, offset });
        if (!data || data.length === 0) break;
        for (const f of data) {
          if (f.metadata && f.metadata.size) { size += f.metadata.size; count++; }
        }
        if (data.length < 1000) break;
        offset += 1000;
      }
      return { size, count };
    }

    // Scan bucket: top level files + 1 level of subfolders
    async function scanBucket(bucket) {
      const { data: topLevel, error } = await supabase.storage.from(bucket).list('', { limit: 1000 });
      if (error || !topLevel) return null;

      let size = 0, count = 0;
      const folderNames = [];

      for (const item of topLevel) {
        if (item.metadata && item.metadata.size) {
          size += item.metadata.size;
          count++;
        } else if (!item.metadata || item.id === null) {
          folderNames.push(item.name);
        }
      }

      // Scan subfolders in parallel
      if (folderNames.length > 0) {
        const folderResults = await Promise.all(folderNames.map(f => listFolder(bucket, f)));
        for (const r of folderResults) { size += r.size; count += r.count; }
      }

      return { bucket, files: count, bytes: size };
    }

    // Scan all buckets in parallel
    const scanResults = await Promise.all(bucketNames.map(b => scanBucket(b)));
    const results = scanResults.filter(r => r && r.files > 0);
    const totalBytes = results.reduce((s, b) => s + b.bytes, 0);
    const limitBytes = 1024 * 1024 * 1024;

    return NextResponse.json({
      buckets: results,
      totalBytes,
      limitBytes,
      usedPercent: Math.round((totalBytes / limitBytes) * 100 * 10) / 10,
    });
  } catch (err) {
    console.error('[admin/storage-usage]', err);
    return NextResponse.json({ error: 'Greška: ' + err.message }, { status: 500 });
  }
}
