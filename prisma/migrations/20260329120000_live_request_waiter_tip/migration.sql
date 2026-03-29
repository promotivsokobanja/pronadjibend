-- Waiter-tip live requests: optional song, type + note
ALTER TABLE "LiveRequest" ADD COLUMN "requestType" TEXT NOT NULL DEFAULT 'SONG';
ALTER TABLE "LiveRequest" ADD COLUMN "guestNote" TEXT;
ALTER TABLE "LiveRequest" ALTER COLUMN "songId" DROP NOT NULL;
