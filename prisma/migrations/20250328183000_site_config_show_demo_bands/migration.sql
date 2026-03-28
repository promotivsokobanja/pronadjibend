-- Javno uključivanje/isključivanje demo bendova (admin panel)
CREATE TABLE "SiteConfig" (
    "id" INTEGER NOT NULL,
    "showDemoBands" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SiteConfig" ("id", "showDemoBands", "updatedAt")
VALUES (1, true, CURRENT_TIMESTAMP);
