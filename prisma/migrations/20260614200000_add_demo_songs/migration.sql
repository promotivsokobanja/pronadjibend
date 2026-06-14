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
