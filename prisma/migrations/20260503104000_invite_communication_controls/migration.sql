ALTER TABLE "SiteConfig"
ADD COLUMN IF NOT EXISTS "inviteCommunicationJson" TEXT;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MusicianInvite') THEN
    ALTER TABLE "MusicianInvite"
    ALTER COLUMN "status" SET DEFAULT 'PENDING';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "InviteBlock" (
  "id" TEXT NOT NULL,
  "blockerBandId" TEXT,
  "blockerMusicianId" TEXT,
  "blockedBandId" TEXT,
  "blockedMusicianId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InviteBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InviteBlock_blockerBandId_createdAt_idx" ON "InviteBlock"("blockerBandId", "createdAt");
CREATE INDEX IF NOT EXISTS "InviteBlock_blockerMusicianId_createdAt_idx" ON "InviteBlock"("blockerMusicianId", "createdAt");
CREATE INDEX IF NOT EXISTS "InviteBlock_blockedBandId_createdAt_idx" ON "InviteBlock"("blockedBandId", "createdAt");
CREATE INDEX IF NOT EXISTS "InviteBlock_blockedMusicianId_createdAt_idx" ON "InviteBlock"("blockedMusicianId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "InviteBlock"
    ADD CONSTRAINT "InviteBlock_blockerBandId_fkey"
    FOREIGN KEY ("blockerBandId") REFERENCES "Band"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InviteBlock"
    ADD CONSTRAINT "InviteBlock_blockerMusicianId_fkey"
    FOREIGN KEY ("blockerMusicianId") REFERENCES "MusicianProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InviteBlock"
    ADD CONSTRAINT "InviteBlock_blockedBandId_fkey"
    FOREIGN KEY ("blockedBandId") REFERENCES "Band"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "InviteBlock"
    ADD CONSTRAINT "InviteBlock_blockedMusicianId_fkey"
    FOREIGN KEY ("blockedMusicianId") REFERENCES "MusicianProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Message') THEN
    ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_inviteId_fkey";
    ALTER TABLE "Message"
      ADD CONSTRAINT "Message_inviteId_fkey"
      FOREIGN KEY ("inviteId") REFERENCES "MusicianInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
