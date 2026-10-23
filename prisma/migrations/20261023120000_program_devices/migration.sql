-- Uređaji povezani prijavom iz programa Pa5X Studio / tableta (svaki ima svoj ključ; čuva se samo SHA-256).
-- Samo dodaje novu tabelu (ništa postojeće se ne menja); može da se pokrene više puta.
CREATE TABLE IF NOT EXISTS "ProgramDevice" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "bandId" TEXT,
    "musicianProfileId" TEXT,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    CONSTRAINT "ProgramDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProgramDevice_keyHash_key" ON "ProgramDevice"("keyHash");
CREATE INDEX IF NOT EXISTS "ProgramDevice_bandId_idx" ON "ProgramDevice"("bandId");
CREATE INDEX IF NOT EXISTS "ProgramDevice_musicianProfileId_idx" ON "ProgramDevice"("musicianProfileId");
