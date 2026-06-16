import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
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
    // Direct SQL query on storage.objects — instant and 100% accurate
    const bucketStats = await prisma.$queryRawUnsafe(`
      SELECT bucket_id, COUNT(*)::int as file_count, COALESCE(SUM((metadata->>'size')::bigint), 0)::bigint as total_size
      FROM storage.objects
      WHERE metadata->>'size' IS NOT NULL
      GROUP BY bucket_id
      ORDER BY total_size DESC
    `);

    const results = bucketStats.map(r => ({
      bucket: r.bucket_id,
      files: Number(r.file_count),
      bytes: Number(r.total_size),
    }));

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
