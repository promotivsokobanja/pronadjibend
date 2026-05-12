import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';
import { getAuthUserFromRequest } from '../../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(request) {
  const authUser = await getAuthUserFromRequest(request);
  if (!authUser?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: { role: true },
  });
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  }

  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const bandId = segments[segments.indexOf('bands') + 1];

  if (!bandId) {
    return NextResponse.json({ error: 'Band ID required.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const verified = Boolean(body?.verified);

  const band = await prisma.band.update({
    where: { id: bandId },
    data: { verified },
    select: { id: true, name: true, verified: true },
  });

  return NextResponse.json({ ok: true, band });
}
