const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const total = await p.song.count();
  const global = await p.song.count({ where: { bandId: null } });
  const withLyrics = await p.song.count({ where: { lyrics: { not: null } } });
  console.log('Total songs:', total);
  console.log('Global (no bandId):', global);
  console.log('With lyrics:', withLyrics);
  await p.$disconnect();
})();
