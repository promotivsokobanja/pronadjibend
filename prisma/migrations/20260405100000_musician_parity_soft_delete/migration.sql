-- Musician parity: new tables + soft delete + musician ownership on existing tables
-- Fully idempotent: uses IF NOT EXISTS and DO $$ blocks to skip already-applied changes.

-- ==========================================
-- 1. New tables (IF NOT EXISTS)
-- ==========================================

CREATE TABLE IF NOT EXISTS "MusicianProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "primaryInstrument" TEXT NOT NULL,
    "genres" TEXT,
    "city" TEXT NOT NULL,
    "priceFromEur" INTEGER,
    "priceToEur" INTEGER,
    "experienceYears" INTEGER,
    "bio" TEXT,
    "img" TEXT,
    "videoUrl" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "MusicianProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MusicianProfile_userId_key" ON "MusicianProfile"("userId");
CREATE INDEX IF NOT EXISTS "MusicianProfile_city_idx" ON "MusicianProfile"("city");
CREATE INDEX IF NOT EXISTS "MusicianProfile_primaryInstrument_idx" ON "MusicianProfile"("primaryInstrument");
CREATE INDEX IF NOT EXISTS "MusicianProfile_isAvailable_isFeatured_idx" ON "MusicianProfile"("isAvailable", "isFeatured");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MusicianProfile_userId_fkey'
  ) THEN
    ALTER TABLE "MusicianProfile" ADD CONSTRAINT "MusicianProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MusicianAvailability" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "musicianId" TEXT NOT NULL,
    CONSTRAINT "MusicianAvailability_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MusicianAvailability_musicianId_date_idx" ON "MusicianAvailability"("musicianId", "date");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MusicianAvailability_musicianId_fkey'
  ) THEN
    ALTER TABLE "MusicianAvailability" ADD CONSTRAINT "MusicianAvailability_musicianId_fkey"
      FOREIGN KEY ("musicianId") REFERENCES "MusicianProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MusicianInvite" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "eventDate" TIMESTAMP(3),
    "location" TEXT,
    "feeEur" INTEGER,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bandId" TEXT NOT NULL,
    "musicianId" TEXT NOT NULL,
    CONSTRAINT "MusicianInvite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MusicianInvite_bandId_createdAt_idx" ON "MusicianInvite"("bandId", "createdAt");
CREATE INDEX IF NOT EXISTS "MusicianInvite_musicianId_createdAt_idx" ON "MusicianInvite"("musicianId", "createdAt");
CREATE INDEX IF NOT EXISTS "MusicianInvite_status_idx" ON "MusicianInvite"("status");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MusicianInvite_bandId_fkey') THEN
    ALTER TABLE "MusicianInvite" ADD CONSTRAINT "MusicianInvite_bandId_fkey"
      FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MusicianInvite_musicianId_fkey') THEN
    ALTER TABLE "MusicianInvite" ADD CONSTRAINT "MusicianInvite_musicianId_fkey"
      FOREIGN KEY ("musicianId") REFERENCES "MusicianProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MidiFile" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "fileType" TEXT NOT NULL DEFAULT 'midi',
    "uploadedBy" TEXT,
    "bandId" TEXT,
    "musicianProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MidiFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MidiFile_category_idx" ON "MidiFile"("category");
CREATE INDEX IF NOT EXISTS "MidiFile_title_idx" ON "MidiFile"("title");
CREATE INDEX IF NOT EXISTS "MidiFile_artist_idx" ON "MidiFile"("artist");
CREATE INDEX IF NOT EXISTS "MidiFile_fileType_idx" ON "MidiFile"("fileType");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MidiFile_bandId_fkey') THEN
    ALTER TABLE "MidiFile" ADD CONSTRAINT "MidiFile_bandId_fkey"
      FOREIGN KEY ("bandId") REFERENCES "Band"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MidiFile_musicianProfileId_fkey') THEN
    ALTER TABLE "MidiFile" ADD CONSTRAINT "MidiFile_musicianProfileId_fkey"
      FOREIGN KEY ("musicianProfileId") REFERENCES "MusicianProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ==========================================
-- 2. Soft delete columns (idempotent)
-- ==========================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='deletedAt') THEN
    ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Band' AND column_name='deletedAt') THEN
    ALTER TABLE "Band" ADD COLUMN "deletedAt" TIMESTAMP(3);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MusicianProfile' AND column_name='deletedAt') THEN
    ALTER TABLE "MusicianProfile" ADD COLUMN "deletedAt" TIMESTAMP(3);
  END IF;
END $$;

-- ==========================================
-- 3. Musician ownership on existing tables
-- ==========================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Song' AND column_name='musicianProfileId') THEN
    ALTER TABLE "Song" ADD COLUMN "musicianProfileId" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Song_musicianProfileId_fkey') THEN
    ALTER TABLE "Song" ADD CONSTRAINT "Song_musicianProfileId_fkey"
      FOREIGN KEY ("musicianProfileId") REFERENCES "MusicianProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='LiveRequest' AND column_name='musicianProfileId') THEN
    ALTER TABLE "LiveRequest" ADD COLUMN "musicianProfileId" TEXT;
  END IF;
END $$;

ALTER TABLE "LiveRequest" ALTER COLUMN "bandId" DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveRequest_musicianProfileId_fkey') THEN
    ALTER TABLE "LiveRequest" ADD CONSTRAINT "LiveRequest_musicianProfileId_fkey"
      FOREIGN KEY ("musicianProfileId") REFERENCES "MusicianProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='SongSubmission' AND column_name='submittedByMusicianId') THEN
    ALTER TABLE "SongSubmission" ADD COLUMN "submittedByMusicianId" TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SongSubmission_submittedByMusicianId_createdAt_idx" ON "SongSubmission"("submittedByMusicianId", "createdAt");
