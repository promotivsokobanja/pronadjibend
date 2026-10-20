-- Korg broj pesme (SongBook ID na Pa5X) i ključ za program MIDI Konverter Pa5X
ALTER TABLE "Song" ADD COLUMN "korgNumber" INTEGER;
ALTER TABLE "Band" ADD COLUMN "programKeyHash" TEXT;
ALTER TABLE "MusicianProfile" ADD COLUMN "programKeyHash" TEXT;
CREATE UNIQUE INDEX "Band_programKeyHash_key" ON "Band"("programKeyHash");
CREATE UNIQUE INDEX "MusicianProfile_programKeyHash_key" ON "MusicianProfile"("programKeyHash");
