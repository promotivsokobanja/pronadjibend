import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../../../../lib/prisma';
import { hasDatabaseUrl } from '../../../../lib/dbClientErrors';

const hasGoogleConfig =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

const handler = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'dev-only-change-me',
  providers: hasGoogleConfig
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : [],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return true;
      if (!process.env.DATABASE_URL) return false;
      const email = String(profile?.email || '')
        .trim()
        .toLowerCase();
      if (!email) return false;
      try {
        const hash = await bcrypt.hash(
          `${crypto.randomUUID()}${crypto.randomUUID()}`,
          10
        );
        await prisma.user.upsert({
          where: { email },
          create: {
            email,
            password: hash,
            role: 'CLIENT',
          },
          update: {},
        });
        return true;
      } catch (e) {
        console.error('Google signIn:', e);
        return false;
      }
    },
    async jwt({ token, user, account, profile }) {
      const email = String(
        profile?.email || token.email || user?.email || ''
      )
        .trim()
        .toLowerCase();
      if (!email) return token;

      if (token.userId && token.role) {
        return token;
      }

      try {
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, role: true, bandId: true },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.bandId = dbUser.bandId;
          token.email = dbUser.email;
        }
      } catch (e) {
        console.error('NextAuth jwt:', e);
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.userId) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.bandId = token.bandId;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
