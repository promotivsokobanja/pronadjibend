import jwt from 'jsonwebtoken';
import { getToken } from 'next-auth/jwt';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'dev-only-change-me';

const NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'dev-only-change-me';

export function readAuthToken(request) {
  return request.cookies.get('auth-token')?.value || '';
}

export function verifyAuthToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function getAuthUserFromRequest(request) {
  const custom = verifyAuthToken(readAuthToken(request));
  if (custom?.userId) return custom;

  try {
    const sessionToken = await getToken({
      req: request,
      secret: NEXTAUTH_SECRET,
    });
    if (!sessionToken?.userId) return null;
    return {
      userId: sessionToken.userId,
      email: sessionToken.email,
      role: sessionToken.role,
      bandId: sessionToken.bandId ?? null,
    };
  } catch {
    return null;
  }
}
