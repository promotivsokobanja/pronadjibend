-- Add senderType column with default "BAND" for existing rows
ALTER TABLE "MusicianInvite" ADD COLUMN IF NOT EXISTS "senderType" TEXT NOT NULL DEFAULT 'BAND';

-- Add senderMusicianId column (nullable FK to MusicianProfile)
ALTER TABLE "MusicianInvite" ADD COLUMN IF NOT EXISTS "senderMusicianId" TEXT;

-- Make bandId nullable (was required before)
ALTER TABLE "MusicianInvite" ALTER COLUMN "bandId" DROP NOT NULL;

-- Add FK constraint for senderMusicianId
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MusicianInvite_senderMusicianId_fkey') THEN
    ALTER TABLE "MusicianInvite" ADD CONSTRAINT "MusicianInvite_senderMusicianId_fkey"
      FOREIGN KEY ("senderMusicianId") REFERENCES "MusicianProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Index for senderMusicianId queries
CREATE INDEX IF NOT EXISTS "MusicianInvite_senderMusicianId_createdAt_idx" ON "MusicianInvite"("senderMusicianId", "createdAt");
