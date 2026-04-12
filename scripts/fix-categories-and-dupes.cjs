/**
 * 1. Normalizuj sve kategorije u bazi (Zabavne → Muške Zabavne, itd.)
 * 2. Obriši globalne duplikate nastale zbog razlike u kategoriji
 *
 * Pokreni: node scripts/fix-categories-and-dupes.cjs
 * Dodaj --dry-run da samo vidiš bez promena
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

const CATEGORY_MAP = {
  'Zabavne': 'Muške Zabavne',
  'Narodne': 'Muške Narodne',
  'Strane': 'Starije Zabavne',
};

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== POKREĆEM POPRAVKE ===');
  console.log('');

  // Step 1: Normalize categories
  console.log('--- KORAK 1: Normalizacija kategorija ---');
  for (const [oldCat, newCat] of Object.entries(CATEGORY_MAP)) {
    const count = await prisma.song.count({ where: { category: oldCat } });
    console.log(`  "${oldCat}" → "${newCat}": ${count} pesama`);
    if (!DRY_RUN && count > 0) {
      await prisma.song.updateMany({
        where: { category: oldCat },
        data: { category: newCat },
      });
    }
  }

  // Step 2: Find and remove global duplicates (bandId: null, same title+artist)
  console.log('\n--- KORAK 2: Brisanje globalnih duplikata ---');
  const globalSongs = await prisma.song.findMany({
    where: { bandId: null },
    select: { id: true, title: true, artist: true, lyrics: true, category: true },
    orderBy: { id: 'asc' },
  });
  console.log(`  Globalnih pesama: ${globalSongs.length}`);

  const groups = new Map();
  for (const song of globalSongs) {
    const key = `${song.title.trim().toLowerCase()}|||${song.artist.trim().toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(song);
  }

  const dupeGroups = [...groups.values()].filter(g => g.length > 1);
  console.log(`  Grupa sa duplikatima: ${dupeGroups.length}`);

  const toDelete = [];
  for (const group of dupeGroups) {
    // Keep: one with lyrics preferred, then first by id
    group.sort((a, b) => {
      const aL = a.lyrics ? 1 : 0;
      const bL = b.lyrics ? 1 : 0;
      if (bL !== aL) return bL - aL;
      return a.id.localeCompare(b.id);
    });
    const keep = group[0];
    const dupes = group.slice(1);
    if (DRY_RUN && toDelete.length < 20) {
      console.log(`    "${keep.title}" - ${keep.artist}: zadrži (${keep.category}), obriši ${dupes.length} (${dupes.map(d => d.category).join(', ')})`);
    }
    toDelete.push(...dupes.map(d => d.id));
  }

  console.log(`\n  Ukupno duplikata za brisanje: ${toDelete.length}`);

  if (DRY_RUN) {
    console.log('\n(dry-run) Ništa nije menjano.');
    return;
  }

  // Delete in batches
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 100) {
    const batch = toDelete.slice(i, i + 100);
    const result = await prisma.song.deleteMany({ where: { id: { in: batch } } });
    deleted += result.count;
  }

  const remaining = await prisma.song.count({ where: { bandId: null } });
  console.log(`\n========== GOTOVO ==========`);
  console.log(`Kategorije normalizovane.`);
  console.log(`Obrisano duplikata: ${deleted}`);
  console.log(`Globalnih pesama preostalo: ${remaining}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
