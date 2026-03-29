-- Band PRO / plan polja (isPaid + plan)
ALTER TABLE "Band" ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Band" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'FREE';
