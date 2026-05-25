import prisma from './prisma';

/**
 * Check if an email is verified in the EmailVerification table.
 * ADMIN users are always considered verified.
 * Returns true if verified, false otherwise.
 */
export async function isEmailVerified(email, role) {
  if (role === 'ADMIN') return true;
  if (!email) return false;
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT "verified" FROM "EmailVerification" WHERE "email" = $1 LIMIT 1`,
      email.toLowerCase().trim()
    );
    if (rows.length === 0) {
      // No verification record — account created before verification system
      return true;
    }
    return rows.some(r => r.verified === true);
  } catch {
    // If table doesn't exist or query fails, don't block the user
    return true;
  }
}
