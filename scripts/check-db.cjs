const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const songCount = await p.song.count();
  const bands = await p.band.findMany({ select: { id: true, name: true } });
  const users = await p.user.findMany({ select: { id: true, email: true, role: true, bandId: true } });

  console.log('Ukupno pesama u bazi:', songCount);
  console.log('\nBendovi:', JSON.stringify(bands, null, 2));
  console.log('\nKorisnici:', JSON.stringify(users, null, 2));

  for (const b of bands) {
    const c = await p.song.count({ where: { bandId: b.id } });
    console.log(`\nPesme za "${b.name}" (${b.id}): ${c}`);
  }

  const orphanSongs = await p.song.count({ where: { bandId: null } });
  console.log('\nPesme bez benda (bandId=null):', orphanSongs);

  await p.$disconnect();
})();
