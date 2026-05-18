-- CreateIndex
CREATE INDEX IF NOT EXISTS "LiveRequest_bandId_status_createdAt_idx" ON "LiveRequest"("bandId", "status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LiveRequest_musicianProfileId_status_createdAt_idx" ON "LiveRequest"("musicianProfileId", "status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LiveRequest_bandId_createdAt_idx" ON "LiveRequest"("bandId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LiveRequest_musicianProfileId_createdAt_idx" ON "LiveRequest"("musicianProfileId", "createdAt");
