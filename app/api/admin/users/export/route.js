import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { requireAdmin } from '../../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

function csvEscape(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * GET /api/admin/users/export
 * Export all users as UTF-8 CSV with BOM for Excel compatibility.
 */
export async function GET(request) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        plan: true,
        createdAt: true,
        deletedAt: true,
        band: { select: { name: true } },
        musicianProfile: { select: { name: true } },
      },
    });

    // Check verification status for all emails in one query
    const emails = users.map(u => u.email);
    let verifiedSet = new Set();
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT DISTINCT "email" FROM "EmailVerification" WHERE "email" = ANY($1) AND "verified" = true`,
        emails
      );
      verifiedSet = new Set(rows.map(r => r.email));
    } catch { /* table might not exist */ }

    const header = ['ID', 'Ime', 'Email', 'Uloga', 'Plan', 'Verifikovan', 'Status', 'Datum registracije'];
    const rows = users.map(u => {
      const name = u.band?.name || u.musicianProfile?.name || '—';
      const verified = verifiedSet.has(u.email) || u.role === 'ADMIN' ? 'Da' : 'Ne';
      const status = u.deletedAt ? 'Deaktiviran' : 'Aktivan';
      const date = new Date(u.createdAt).toLocaleString('sr-RS');
      return [u.id, name, u.email, u.role, u.plan, verified, status, date].map(csvEscape).join(',');
    });

    // BOM + CSV content
    const bom = '\uFEFF';
    const csv = bom + header.join(',') + '\n' + rows.join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="korisnici-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('[admin/users/export]', error);
    return NextResponse.json({ error: 'Greška pri exportu.' }, { status: 500 });
  }
}
