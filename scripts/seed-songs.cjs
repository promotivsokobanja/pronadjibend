const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Find all bands in the database
  const bands = await prisma.band.findMany({ select: { id: true, name: true } });

  if (bands.length === 0) {
    console.log('Nema bendova u bazi. Prvo registruj bend na sajtu.');
    return;
  }

  console.log(`Pronađeno ${bands.length} bendova:`);
  bands.forEach((b, i) => console.log(`  ${i + 1}. ${b.name} (${b.id})`));

  // Load songs from lib/songs.js (CommonJS workaround)
  const fs = require('fs');
  const path = require('path');
  const songsFile = fs.readFileSync(path.join(__dirname, '..', 'lib', 'songs.js'), 'utf8');

  // Extract the array from the ES module
  const match = songsFile.match(/export const songs\s*=\s*(\[[\s\S]*\]);/);
  if (!match) {
    console.error('Ne mogu da parsiram lib/songs.js');
    return;
  }

  // Eval the array (safe since it's our own file with only data literals)
  const songs = eval(match[1]);
  console.log(`\nUčitano ${songs.length} pesama iz lib/songs.js`);

  // Seed songs for EACH band
  let totalCreated = 0;

  for (const band of bands) {
    // Check how many songs this band already has
    const existingCount = await prisma.song.count({ where: { bandId: band.id } });

    if (existingCount >= songs.length) {
      console.log(`\n${band.name}: već ima ${existingCount} pesama, preskačem.`);
      continue;
    }

    // Get existing song titles for this band to avoid duplicates
    const existingTitles = new Set(
      (await prisma.song.findMany({
        where: { bandId: band.id },
        select: { title: true, artist: true },
      })).map(s => `${s.title}|||${s.artist}`)
    );

    const toInsert = songs
      .filter(s => !existingTitles.has(`${s.title}|||${s.artist}`))
      .map(s => ({
        title: s.title,
        artist: s.artist,
        category: s.type || null,
        type: s.type || null,
        bandId: band.id,
      }));

    if (toInsert.length === 0) {
      console.log(`\n${band.name}: sve pesme već postoje.`);
      continue;
    }

    const result = await prisma.song.createMany({ data: toInsert, skipDuplicates: true });
    totalCreated += result.count;
    console.log(`\n${band.name}: dodato ${result.count} pesama.`);
  }

  console.log(`\nGotovo! Ukupno dodato: ${totalCreated} pesama.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
