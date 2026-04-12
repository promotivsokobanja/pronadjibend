/**
 * Skripta za pronalaženje i brisanje duplikata pesama u bazi.
 *
 * Logika:
 * - Grupiše pesme po (title, artist, bandId/musicianProfileId) case-insensitive
 * - Za svaku grupu duplikata, zadržava jednu pesmu (prioritet: ima lyrics > najstarija)
 * - Briše ostale duplikate
 *
 * Pokreni: node scripts/remove-duplicate-songs.cjs
 * Dodaj --dry-run da samo vidiš šta bi se obrisalo bez brisanja
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

function normalizeKey(str) {
  return String(str || '').trim().toLowerCase();
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (neće se ništa obrisati) ===' : '=== BRISANJE DUPLIKATA ===');
  console.log('');

  const allSongs = await prisma.song.findMany({
    select: {
      id: true,
      title: true,
      artist: true,
      bandId: true,
      musicianProfileId: true,
      lyrics: true,
      category: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(`Ukupno pesama u bazi: ${allSongs.length}`);

  // Group by normalized (title, artist, owner)
  const groups = new Map();
  for (const song of allSongs) {
    const owner = song.bandId || song.musicianProfileId || '__global__';
    const key = `${normalizeKey(song.title)}|||${normalizeKey(song.artist)}|||${owner}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(song);
  }

  const duplicateGroups = [...groups.values()].filter((g) => g.length > 1);
  console.log(`Grupa sa duplikatima: ${duplicateGroups.length}`);

  const toDelete = [];

  for (const group of duplicateGroups) {
    // Sort: prefer the one with lyrics, then oldest
    group.sort((a, b) => {
      const aHasLyrics = a.lyrics ? 1 : 0;
      const bHasLyrics = b.lyrics ? 1 : 0;
      if (bHasLyrics !== aHasLyrics) return bHasLyrics - aHasLyrics; // lyrics first
      return a.id.localeCompare(b.id); // oldest (by id) first
    });

    const keep = group[0];
    const dupes = group.slice(1);

    if (DRY_RUN) {
      const owner = keep.bandId ? `band:${keep.bandId}` : keep.musicianProfileId ? `musician:${keep.musicianProfileId}` : 'global';
      const keepCat = keep.category || 'bez kategorije';
      const dupeCats = dupes.map(d => d.category || 'bez kategorije').join(', ');
      console.log(`  "${keep.title}" - ${keep.artist} [${owner}]: zadrži ${keep.id} (${keepCat}), obriši ${dupes.length} (${dupeCats})`);
    }

    toDelete.push(...dupes.map((d) => d.id));
  }

  console.log(`\nUkupno duplikata za brisanje: ${toDelete.length}`);

  if (DRY_RUN) {
    console.log('\n(dry-run) Ništa nije obrisano. Pokreni bez --dry-run da obrišeš.');
    return;
  }

  if (toDelete.length === 0) {
    console.log('Nema duplikata. Baza je čista.');
    return;
  }

  // Delete in batches of 100
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 100) {
    const batch = toDelete.slice(i, i + 100);
    const result = await prisma.song.deleteMany({
      where: { id: { in: batch } },
    });
    deleted += result.count;
    console.log(`  Obrisano ${deleted}/${toDelete.length}...`);
  }

  const remaining = await prisma.song.count();
  console.log(`\n========== GOTOVO ==========`);
  console.log(`Obrisano duplikata: ${deleted}`);
  console.log(`Preostalo pesama u bazi: ${remaining}`);
}

main()
  .catch((err) => {
    console.error('Greška:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
