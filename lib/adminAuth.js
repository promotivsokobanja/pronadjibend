import { NextResponse } from 'next/server';
import prisma from './prisma';
import { getAuthUserFromRequest } from './auth';
import { responseFromDatabaseError } from './dbClientErrors';

export async function requireAdmin(request) {
  const auth = await getAuthUserFromRequest(request);
  if (!auth?.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 }),
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Nalog više ne postoji. Prijavite se ponovo.' },
          { status: 401 }
        ),
      };
    }

    if (user.role !== 'ADMIN') {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Nemate administratorska prava.' },
          { status: 403 }
        ),
      };
    }

    return { ok: true, admin: { id: user.id, email: user.email } };
  } catch (error) {
    console.error('requireAdmin', error);
    const safe = responseFromDatabaseError(error);
    if (safe) return { ok: false, response: safe };
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Greška pri proveri admin pristupa. Pokušajte kasnije.' },
        { status: 503 }
      ),
    };
  }
}
