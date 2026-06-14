-- CreateTable
CREATE TABLE "DemoSong" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "previewPath" TEXT,
    "previewDuration" INTEGER,
    "driveLink" TEXT,
    "allowDownload" BOOLEAN NOT NULL DEFAULT false,
    "price" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoSong_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoSong_isActive_createdAt_idx" ON "DemoSong"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "DemoSong_category_idx" ON "DemoSong"("category");

-- CreateTable
CREATE TABLE "DemoSongAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DemoSongAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemoSongAccess_userId_songId_key" ON "DemoSongAccess"("userId", "songId");

-- CreateIndex
CREATE INDEX "DemoSongAccess_status_idx" ON "DemoSongAccess"("status");

-- AddForeignKey
ALTER TABLE "DemoSongAccess" ADD CONSTRAINT "DemoSongAccess_songId_fkey" FOREIGN KEY ("songId") REFERENCES "DemoSong"("id") ON DELETE CASCADE ON UPDATE CASCADE;
