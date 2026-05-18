const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Applying LiveRequest indexes...');
  
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "LiveRequest_bandId_status_createdAt_idx" ON "LiveRequest"("bandId", "status", "createdAt")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "LiveRequest_musicianProfileId_status_createdAt_idx" ON "LiveRequest"("musicianProfileId", "status", "createdAt")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "LiveRequest_bandId_createdAt_idx" ON "LiveRequest"("bandId", "createdAt")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "LiveRequest_musicianProfileId_createdAt_idx" ON "LiveRequest"("musicianProfileId", "createdAt")`
  );

  console.log('All indexes applied successfully.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error applying indexes:', e);
  process.exit(1);
});
