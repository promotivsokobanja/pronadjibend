import { getToken } from 'next-auth/jwt';

const NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'dev-only-change-me';

export async function getAuthUserFromRequest(request) {
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
