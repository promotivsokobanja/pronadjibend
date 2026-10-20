-- Korg broj pesme (SongBook ID na Pa5X) i ključ za program MIDI Konverter Pa5X
-- Samo dodaje nove kolone (ništa se ne briše); može da se pokrene više puta.
ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "korgNumber" INTEGER;
ALTER TABLE "Band" ADD COLUMN IF NOT EXISTS "programKeyHash" TEXT;
ALTER TABLE "MusicianProfile" ADD COLUMN IF NOT EXISTS "programKeyHash" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Band_programKeyHash_key" ON "Band"("programKeyHash");
CREATE UNIQUE INDEX IF NOT EXISTS "MusicianProfile_programKeyHash_key" ON "MusicianProfile"("programKeyHash");
