import jwt from 'jsonwebtoken';
import { getToken } from 'next-auth/jwt';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'dev-only-change-me';

const NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'dev-only-change-me';

import { cookies } from 'next/headers';

export function readAuthToken(request) {
  if (request) return request.cookies.get('auth-token')?.value || '';
  return cookies().get('auth-token')?.value || '';
}

export function verifyAuthToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function getAuthUserFromCookies() {
  const token = cookies().get('auth-token')?.value;
  const custom = verifyAuthToken(token);
  if (custom?.userId) return custom;

  try {
    // next-auth getToken requires a request object, 
    // but we can try to get the session token manually from cookies
    const sessionToken = cookies().get('next-auth.session-token')?.value || 
                         cookies().get('__Secure-next-auth.session-token')?.value;
    
    if (!sessionToken) return null;
    
    // Note: next-auth tokens are encrypted, so we can't easily decrypt them 
    // here without the request object that getToken expects.
    // However, if the user uses the custom 'auth-token', it will work.
    return null; 
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
