CREATE TABLE "SongSubmission" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "artist" TEXT NOT NULL,
  "lyrics" TEXT,
  "chords" TEXT,
  "key" TEXT,
  "category" TEXT,
  "type" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "sourceSongId" TEXT,
  "submittedByBandId" TEXT,
  "reviewedByUserId" TEXT,
  "approvedSongId" TEXT,
  "rejectReason" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SongSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SongSubmission_status_createdAt_idx" ON "SongSubmission"("status", "createdAt");
CREATE INDEX "SongSubmission_submittedByBandId_createdAt_idx" ON "SongSubmission"("submittedByBandId", "createdAt");
