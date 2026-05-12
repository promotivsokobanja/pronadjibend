import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// GET — get or generate referral code for current user
export async function GET(req) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: { referralCode: true, referredBy: true },
  });

  if (!user.referralCode) {
    let code = generateCode();
    let attempts = 0;
    while (attempts < 5) {
      try {
        user = await prisma.user.update({
          where: { id: authUser.userId },
          data: { referralCode: code },
          select: { referralCode: true, referredBy: true },
        });
        break;
      } catch {
        code = generateCode();
        attempts++;
      }
    }
  }

  // Count how many users referred
  const referredCount = await prisma.user.count({
    where: { referredBy: user.referralCode },
  });

  return NextResponse.json({
    referralCode: user.referralCode,
    referredBy: user.referredBy,
    referredCount,
    shareUrl: `https://pronadjibend.rs/register?ref=${user.referralCode}`,
  });
}

// POST — apply a referral code (called during/after registration)
export async function POST(req) {
  const authUser = await getAuthUserFromRequest(req);
  if (!authUser?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || '').trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ error: 'Referral kod je obavezan.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: { referredBy: true, referralCode: true },
  });

  if (user.referredBy) {
    return NextResponse.json({ error: 'Već ste iskoristili referral kod.' }, { status: 400 });
  }

  if (user.referralCode === code) {
    return NextResponse.json({ error: 'Ne možete koristiti sopstveni kod.' }, { status: 400 });
  }

  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true },
  });

  if (!referrer) {
    return NextResponse.json({ error: 'Nevažeći referral kod.' }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: authUser.userId },
    data: { referredBy: code },
  });

  return NextResponse.json({ ok: true, appliedCode: code });
}
