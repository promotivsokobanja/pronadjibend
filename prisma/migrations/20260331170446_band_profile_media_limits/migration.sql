-- Band profile media limits + maintenance mode
ALTER TABLE "SiteConfig" ADD COLUMN "bandProfileMaxImages" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "SiteConfig" ADD COLUMN "bandProfileMaxVideos" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "SiteConfig" ADD COLUMN "bandProfileMaxLinks" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "SiteConfig" ADD COLUMN "maintenanceMode" BOOLEAN NOT NULL DEFAULT false;
