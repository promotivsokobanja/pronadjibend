const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const noLyrics = await p.song.findMany({
    where: { lyrics: null },
    select: { title: true, artist: true },
    distinct: ['title', 'artist'],
  });
  
  const unique = new Map();
  noLyrics.forEach(s => {
    const k = s.title + '|||' + s.artist;
    if (!unique.has(k)) unique.set(k, s);
  });

  console.log(`Songs still missing lyrics: ${unique.size}\n`);
  let i = 0;
  for (const s of unique.values()) {
    console.log(`  ${s.title}  |  ${s.artist}`);
    if (++i >= 80) { console.log('  ... and more'); break; }
  }

  await p.$disconnect();
})();
