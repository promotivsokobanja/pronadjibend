-- CreateTable
CREATE TABLE IF NOT EXISTS "PasswordReset" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmailVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordReset_token_key" ON "PasswordReset"("token");
CREATE INDEX IF NOT EXISTS "PasswordReset_email_idx" ON "PasswordReset"("email");
CREATE INDEX IF NOT EXISTS "PasswordReset_token_idx" ON "PasswordReset"("token");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerification_token_key" ON "EmailVerification"("token");
CREATE INDEX IF NOT EXISTS "EmailVerification_email_idx" ON "EmailVerification"("email");
CREATE INDEX IF NOT EXISTS "EmailVerification_token_idx" ON "EmailVerification"("token");
