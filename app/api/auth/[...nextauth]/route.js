import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../../../../lib/prisma';
import { hasDatabaseUrl } from '../../../../lib/dbClientErrors';
import { isDisposableEmail } from '../../../../lib/emailPolicy';

const hasGoogleConfig =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const providers = [
  CredentialsProvider({
    name: 'Credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!hasDatabaseUrl()) return null;

      const email = String(credentials?.email || '')
        .trim()
        .toLowerCase();
      const password = String(credentials?.password || '').trim();

      if (!email || !password) return null;
      if (!EMAIL_REGEX.test(email)) return null;
      if (password.length < 6 || password.length > 128) return null;

      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, password: true, role: true, bandId: true },
      });

      if (!dbUser?.password) return null;

      const ok = await bcrypt.compare(password, dbUser.password);
      if (!ok) return null;

      return {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        bandId: dbUser.bandId ?? null,
      };
    },
  }),
];

if (hasGoogleConfig) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

const handler = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'dev-only-change-me',
  providers,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (!account?.provider || account.provider === 'credentials') return true;
      if (!hasDatabaseUrl()) return false;
      const email = String(profile?.email || '')
        .trim()
        .toLowerCase();
      if (!email) return false;
      if (isDisposableEmail(email)) return false;
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
        console.error('OAuth signIn:', e);
        return false;
      }
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === 'credentials' && user?.id) {
        token.userId = user.id;
        token.role = user.role;
        token.bandId = user.bandId ?? null;
        token.email = user.email;
        return token;
      }

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
