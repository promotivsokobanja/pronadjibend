/**
 * One-time cleanup: remove duplicate SetListItem entries (same songId in same setList).
 * Keeps the first item (lowest position) and deletes the rest.
 * Safe: only deletes SetListItem rows, does NOT touch songs or set lists.
 *
 * Run: node scripts/dedup-setlist-items.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allItems = await prisma.setListItem.findMany({
    orderBy: { position: 'asc' },
  });

  // Group by setListId + songId
  const groups = {};
  for (const item of allItems) {
    const key = `${item.setListId}::${item.songId}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  const toDelete = [];
  for (const [key, items] of Object.entries(groups)) {
    if (items.length > 1) {
      // Keep first, delete rest
      const duplicates = items.slice(1);
      toDelete.push(...duplicates.map((d) => d.id));
      console.log(`  Duplicate: setList=${items[0].setListId}, songId=${items[0].songId} — removing ${duplicates.length} extra(s)`);
    }
  }

  if (toDelete.length === 0) {
    console.log('✓ No duplicates found. Database is clean.');
    return;
  }

  console.log(`\nDeleting ${toDelete.length} duplicate SetListItem(s)...`);
  const result = await prisma.setListItem.deleteMany({
    where: { id: { in: toDelete } },
  });
  console.log(`✓ Removed ${result.count} duplicate entries.`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
