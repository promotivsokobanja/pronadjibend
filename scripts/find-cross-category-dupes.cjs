const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find songs with same title+artist that appear in multiple categories (any owner)
  const allSongs = await prisma.song.findMany({
    select: { id: true, title: true, artist: true, category: true, bandId: true, musicianProfileId: true, lyrics: true },
    orderBy: { id: 'asc' },
  });

  console.log(`Ukupno pesama: ${allSongs.length}\n`);

  // Group by normalized title+artist (ignoring category AND owner)
  const groups = new Map();
  for (const song of allSongs) {
    const key = `${song.title.trim().toLowerCase()}|||${song.artist.trim().toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(song);
  }

  const dupeGroups = [...groups.values()].filter(g => g.length > 1);
  console.log(`Grupa sa 2+ zapisa (isti naslov+izvođač, razl. kategorija/vlasnik): ${dupeGroups.length}\n`);

  let crossCatCount = 0;
  let crossOwnerCount = 0;
  const crossCatDupes = [];

  for (const group of dupeGroups) {
    const cats = new Set(group.map(s => s.category || 'null'));
    const owners = new Set(group.map(s => s.bandId || s.musicianProfileId || 'global'));

    if (cats.size > 1 && owners.size === 1) {
      crossCatCount++;
      crossCatDupes.push(group);
      if (crossCatCount <= 20) {
        const s = group[0];
        const catList = [...cats].join(', ');
        const owner = s.bandId ? `band` : s.musicianProfileId ? `musician` : 'global';
        console.log(`  [${owner}] "${s.title}" - ${s.artist} => kategorije: ${catList} (${group.length} zapisa)`);
      }
    } else if (owners.size > 1) {
      crossOwnerCount++;
    }
  }

  console.log(`\nDuplikati razl. kategorija (isti vlasnik): ${crossCatCount}`);
  console.log(`Duplikati razl. vlasnika (band vs global): ${crossOwnerCount}`);

  // Count total deleteable cross-category dupes
  let totalToDelete = 0;
  for (const group of crossCatDupes) {
    group.sort((a, b) => {
      const aL = a.lyrics ? 1 : 0;
      const bL = b.lyrics ? 1 : 0;
      if (bL !== aL) return bL - aL;
      return a.id.localeCompare(b.id);
    });
    totalToDelete += group.length - 1;
  }
  console.log(`Ukupno cross-category duplikata za brisanje: ${totalToDelete}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
