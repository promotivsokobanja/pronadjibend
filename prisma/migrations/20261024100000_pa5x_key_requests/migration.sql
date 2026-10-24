-- Zahtevi za ključ programa Pa5X Studio / Pa5X Plejer: program pošalje kod uređaja, vlasnik izda ključ u svom
-- alatu (potpis ostaje kod vlasnika), program ga sam preuzme. Samo dodaje novu tabelu; može više puta.
CREATE TABLE IF NOT EXISTS "Pa5xKeyRequest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ceka',
    "key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pa5xKeyRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Pa5xKeyRequest_code_key" ON "Pa5xKeyRequest"("code");
CREATE INDEX IF NOT EXISTS "Pa5xKeyRequest_status_createdAt_idx" ON "Pa5xKeyRequest"("status", "createdAt");
