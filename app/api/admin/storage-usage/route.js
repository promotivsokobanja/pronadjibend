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

    // Query storage.objects via Supabase PostgREST (storage schema)
    const { data: objects, error } = await supabase
      .schema('storage')
      .from('objects')
      .select('bucket_id, metadata');

    if (error) {
      console.error('[storage-usage] query error:', error);
      return NextResponse.json({ error: 'Greška: ' + error.message }, { status: 500 });
    }

    // Aggregate by bucket
    const bucketMap = {};
    for (const obj of (objects || [])) {
      const b = obj.bucket_id;
      if (!bucketMap[b]) bucketMap[b] = { files: 0, bytes: 0 };
      bucketMap[b].files++;
      const sz = obj.metadata?.size || 0;
      bucketMap[b].bytes += sz;
    }

    const results = Object.entries(bucketMap)
      .map(([bucket, stats]) => ({ bucket, ...stats }))
      .sort((a, b) => b.bytes - a.bytes);

    const totalBytes = results.reduce((s, b) => s + b.bytes, 0);
    const limitBytes = 1024 * 1024 * 1024; // 1 GB free plan

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
