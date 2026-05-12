const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const queries = [
    `ALTER TABLE "Band" ADD COLUMN IF NOT EXISTS "galleryJson" TEXT`,
    `ALTER TABLE "Band" ADD COLUMN IF NOT EXISTS "profileViews" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "Band" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "Band" ADD COLUMN IF NOT EXISTS "packagesJson" TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredBy" TEXT`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode")`,
    `CREATE TABLE IF NOT EXISTS "ContactMessage" (
      "id" TEXT NOT NULL,
      "bandId" TEXT NOT NULL,
      "senderName" TEXT NOT NULL,
      "senderEmail" TEXT NOT NULL,
      "senderPhone" TEXT,
      "subject" TEXT,
      "body" TEXT NOT NULL,
      "read" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "ContactMessage_bandId_createdAt_idx" ON "ContactMessage"("bandId", "createdAt")`,
    `CREATE TABLE IF NOT EXISTS "Notification" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "body" TEXT,
      "link" TEXT,
      "read" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt")`,
    `CREATE TABLE IF NOT EXISTS "BlogPost" (
      "id" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "excerpt" TEXT,
      "body" TEXT NOT NULL,
      "coverImage" TEXT,
      "published" BOOLEAN NOT NULL DEFAULT false,
      "authorName" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "BlogPost_slug_key" ON "BlogPost"("slug")`,
    `CREATE INDEX IF NOT EXISTS "BlogPost_published_createdAt_idx" ON "BlogPost"("published", "createdAt")`,
  ];

  for (const sql of queries) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('OK:', sql.substring(0, 60) + '...');
    } catch (e) {
      console.log('SKIP/ERR:', sql.substring(0, 60), '-', e.message?.substring(0, 80));
    }
  }
  console.log('\nDone! All migrations applied.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
