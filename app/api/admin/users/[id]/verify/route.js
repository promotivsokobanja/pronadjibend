import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';
import { requireAdmin } from '../../../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/users/[id]/verify
 * Manually verify a user's email by inserting a verified record into EmailVerification.
 */
export async function PATCH(request, { params }) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Nedostaje ID korisnika.' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Korisnik nije pronađen.' }, { status: 404 });
    }

    // Check if already verified
    const existing = await prisma.$queryRawUnsafe(
      `SELECT 1 FROM "EmailVerification" WHERE "email" = $1 AND "verified" = true LIMIT 1`,
      user.email
    );

    if (existing.length > 0) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    // Insert a verified record
    const id_ = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "EmailVerification" ("id", "email", "token", "expiresAt", "verified", "createdAt")
       VALUES ($1, $2, $3, NOW(), true, NOW())`,
      id_,
      user.email,
      `admin-verify-${id_}`
    );

    return NextResponse.json({ ok: true, email: user.email });
  } catch (error) {
    console.error('[admin/users/verify]', error);
    return NextResponse.json({ error: 'Greška pri verifikaciji.' }, { status: 500 });
  }
}
