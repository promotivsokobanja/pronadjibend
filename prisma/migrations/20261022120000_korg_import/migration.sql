-- Uvoz Korg SongBook-a iz programa MIDI Konverter Pa5X: samo nova tabela (ništa postojeće se ne menja);
-- može da se pokrene više puta.
CREATE TABLE IF NOT EXISTS "KorgImport" (
    "id" TEXT NOT NULL,
    "bandId" TEXT,
    "musicianProfileId" TEXT,
    "entries" JSONB NOT NULL,
    "lists" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KorgImport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "KorgImport_bandId_idx" ON "KorgImport"("bandId");
CREATE INDEX IF NOT EXISTS "KorgImport_musicianProfileId_idx" ON "KorgImport"("musicianProfileId");
