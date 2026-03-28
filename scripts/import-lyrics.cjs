const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const PESMARICA_ROOT = path.join(
  process.env.USERPROFILE || 'C:\\Users\\Studios',
  'Desktop',
  'Pesmarica'
);

function removeDiacritics(str) {
  const map = {
    'č': 'c', 'ć': 'c', 'đ': 'dj', 'š': 's', 'ž': 'z',
    'Č': 'C', 'Ć': 'C', 'Đ': 'Dj', 'Š': 'S', 'Ž': 'Z',
    'ä': 'a', 'ö': 'o', 'ü': 'u', 'ë': 'e', 'ï': 'i',
  };
  return str.replace(/[čćđšžČĆĐŠŽäöüëï]/g, (ch) => map[ch] || ch);
}

function normalize(str) {
  return removeDiacritics(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function buildFileIndex() {
  console.log('Indexing Pesmarica folder...');
  const index = new Map();
  
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.txt')) {
        const base = entry.name.replace(/\.txt$/i, '');
        const parts = base.split(' - ');
        if (parts.length >= 2) {
          const titlePart = parts[0].trim();
          const artistPart = parts.slice(1).join(' - ').trim();
          
          const key1 = normalize(titlePart) + '|||' + normalize(artistPart);
          const key2 = normalize(artistPart) + '|||' + normalize(titlePart);
          
          if (!index.has(key1)) index.set(key1, fullPath);
          if (!index.has(key2)) index.set(key2, fullPath);

          const titleOnly = normalize(titlePart);
          if (!index.has('title:' + titleOnly)) {
            index.set('title:' + titleOnly, fullPath);
          }
        }
      }
    }
  }
  
  walk(PESMARICA_ROOT);
  console.log(`Indexed ${index.size} entries from Pesmarica.\n`);
  return index;
}

function readLyrics(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/^\uFEFF/, '');
    
    const lines = content.split(/\r?\n/);
    let startIdx = 0;
    
    if (lines.length >= 3) {
      const firstTwoNonEmpty = lines.slice(0, 5).filter(l => l.trim().length > 0);
      if (firstTwoNonEmpty.length >= 2) {
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          if (lines[i].trim() === '') {
            startIdx = i + 1;
            break;
          }
        }
      }
    }

    const lyrics = lines.slice(startIdx).join('\n').trim();
    return lyrics.length > 10 ? lyrics : null;
  } catch {
    return null;
  }
}

function findMatch(song, fileIndex) {
  const songTitle = normalize(song.title);
  const songArtist = normalize(song.artist);

  const key1 = songTitle + '|||' + songArtist;
  if (fileIndex.has(key1)) return fileIndex.get(key1);

  const key2 = songArtist + '|||' + songTitle;
  if (fileIndex.has(key2)) return fileIndex.get(key2);

  const shortArtist = normalize(song.artist.split(/[,&]/)[0].trim());
  const key3 = songTitle + '|||' + shortArtist;
  if (fileIndex.has(key3)) return fileIndex.get(key3);
  const key4 = shortArtist + '|||' + songTitle;
  if (fileIndex.has(key4)) return fileIndex.get(key4);

  const artistParts = songArtist.split(/\s+/);
  if (artistParts.length >= 2) {
    const lastName = artistParts[artistParts.length - 1];
    for (const [key, val] of fileIndex) {
      if (key.startsWith(songTitle + '|||') && key.includes(lastName)) return val;
      if (key.endsWith('|||' + songTitle) && key.includes(lastName)) return val;
    }
  }

  if (fileIndex.has('title:' + songTitle)) {
    return fileIndex.get('title:' + songTitle);
  }

  return null;
}

async function main() {
  const songs = await prisma.song.findMany({
    where: { lyrics: null },
    select: { id: true, title: true, artist: true, bandId: true },
  });

  console.log(`Found ${songs.length} songs without lyrics in database.\n`);

  if (songs.length === 0) {
    console.log('All songs already have lyrics!');
    return;
  }

  const fileIndex = buildFileIndex();

  let matched = 0;
  let notFound = 0;
  const notFoundList = [];

  const uniqueSongs = new Map();
  for (const song of songs) {
    const key = normalize(song.title) + '|||' + normalize(song.artist);
    if (!uniqueSongs.has(key)) {
      uniqueSongs.set(key, []);
    }
    uniqueSongs.get(key).push(song);
  }

  console.log(`Unique title/artist combos: ${uniqueSongs.size}\n`);

  for (const [key, songGroup] of uniqueSongs) {
    const representative = songGroup[0];
    const filePath = findMatch(representative, fileIndex);
    
    if (filePath) {
      const lyrics = readLyrics(filePath);
      if (lyrics) {
        const ids = songGroup.map(s => s.id);
        await prisma.song.updateMany({
          where: { id: { in: ids } },
          data: { lyrics },
        });
        matched++;
        if (matched <= 10) {
          console.log(`  ✓ "${representative.title}" — ${representative.artist}  (${songGroup.length} copies)`);
        }
      } else {
        notFound++;
        notFoundList.push(`${representative.title} — ${representative.artist}`);
      }
    } else {
      notFound++;
      notFoundList.push(`${representative.title} — ${representative.artist}`);
    }
  }

  console.log(`\n========== RESULTS ==========`);
  console.log(`Matched & updated: ${matched} unique songs`);
  console.log(`Not found: ${notFound}`);
  
  if (notFoundList.length > 0 && notFoundList.length <= 200) {
    console.log(`\nNot found list:`);
    notFoundList.forEach(s => console.log(`  ✗ ${s}`));
  }

  const totalUpdated = await prisma.song.count({ where: { lyrics: { not: null } } });
  const totalSongs = await prisma.song.count();
  console.log(`\nTotal songs with lyrics: ${totalUpdated}/${totalSongs}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
