-- „Pozovi na Korgu“ iz Live panela (program / tablet pripremi pesmu na Korgu po SongBook broju).
-- Samo dodaje novu tabelu (ništa postojeće se ne menja); može da se pokrene više puta.
CREATE TABLE IF NOT EXISTS "ProgramCommand" (
    "id" TEXT NOT NULL,
    "bandId" TEXT,
    "musicianProfileId" TEXT,
    "songId" TEXT,
    "korgNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgramCommand_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProgramCommand_bandId_createdAt_idx" ON "ProgramCommand"("bandId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProgramCommand_musicianProfileId_createdAt_idx" ON "ProgramCommand"("musicianProfileId", "createdAt");
