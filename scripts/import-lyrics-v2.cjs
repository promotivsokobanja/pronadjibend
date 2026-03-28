const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const PESMARICA_ROOT = path.join(
  process.env.USERPROFILE || 'C:\\Users\\Studios',
  'Desktop',
  'Pesmarica'
);

const ARTIST_EXPANSIONS = {
  'tose p': ['tose proeski'],
  'oliver d': ['oliver dragojevic'],
  'aco p': ['aco pejovic'],
  'sasa m': ['sasa matic'],
  'sasa k': ['sasa kovacevic'],
  'zeljko s': ['zeljko samardzic'],
  'zeljko j': ['zeljko joksimovic'],
  'zeljko v': ['zeljko vasic'],
  'dado p': ['dado polumenta'],
  'sergej c': ['sergej cetkovic'],
  'tony c': ['tony cetinski'],
  'dino m': ['dino merlin'],
  'emina j': ['emina jahovic', 'emina'],
  'dzenan l': ['dzenan loncarevic'],
  'doris d': ['doris dragovic'],
  'goca t': ['goca trzan'],
  'cira': ['cira'],
  'b panters': ['black panters'],
  'merlin': ['dino merlin'],
  'ogi': ['ogi radivojevic'],
  'dzej': ['dzej ramadanovski'],
  'bebek': ['zeljko bebek'],
};

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
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(str) {
  return normalize(str).replace(/\s/g, '');
}

function buildFileIndex() {
  console.log('Indexing Pesmarica folder...');
  const index = new Map();
  const titleIndex = new Map();
  
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.txt')) {
        const base = entry.name.replace(/\.txt$/i, '');
        const parts = base.split(' - ');
        if (parts.length >= 2) {
          const p1 = normalize(parts[0]);
          const p2 = normalize(parts.slice(1).join(' - '));
          const k1 = normalizeKey(p1) + '|||' + normalizeKey(p2);
          const k2 = normalizeKey(p2) + '|||' + normalizeKey(p1);
          
          if (!index.has(k1)) index.set(k1, fullPath);
          if (!index.has(k2)) index.set(k2, fullPath);

          if (!titleIndex.has(normalizeKey(p1))) {
            titleIndex.set(normalizeKey(p1), []);
          }
          titleIndex.get(normalizeKey(p1)).push({ artist: p2, path: fullPath });
          
          if (!titleIndex.has(normalizeKey(p2))) {
            titleIndex.set(normalizeKey(p2), []);
          }
          titleIndex.get(normalizeKey(p2)).push({ artist: p1, path: fullPath });
        }
      }
    }
  }
  
  walk(PESMARICA_ROOT);
  console.log(`Indexed ${index.size} key entries, ${titleIndex.size} title entries.\n`);
  return { index, titleIndex };
}

function readLyrics(filePath) {
  try {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      content = fs.readFileSync(filePath, 'latin1');
    }
    content = content.replace(/^\uFEFF/, '');
    
    const lines = content.split(/\r?\n/);
    let startIdx = 0;
    
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      if (lines[i].trim() === '' && i >= 1) {
        startIdx = i + 1;
        break;
      }
    }

    const lyrics = lines.slice(startIdx).join('\n').trim();
    return lyrics.length > 10 ? lyrics : null;
  } catch {
    return null;
  }
}

function getExpandedArtists(artist) {
  const norm = normalize(artist);
  const nk = normalizeKey(artist);
  const results = [nk];
  
  for (const [abbrev, expansions] of Object.entries(ARTIST_EXPANSIONS)) {
    const normAbbrev = abbrev.replace(/\s/g, '');
    if (nk === normAbbrev || norm === abbrev) {
      expansions.forEach(e => results.push(e.replace(/\s/g, '')));
    }
  }
  
  const dotMatch = norm.match(/^(.+?)\s+(\w)\.?$/);
  if (dotMatch) {
    results.push(normalizeKey(dotMatch[1]));
  }

  return [...new Set(results)];
}

function findMatch(song, { index, titleIndex }) {
  const songTitle = normalizeKey(song.title);
  const songArtist = normalizeKey(song.artist);
  const expandedArtists = getExpandedArtists(song.artist);

  for (const art of expandedArtists) {
    const k = songTitle + '|||' + art;
    if (index.has(k)) return index.get(k);
    const k2 = art + '|||' + songTitle;
    if (index.has(k2)) return index.get(k2);
  }

  if (titleIndex.has(songTitle)) {
    const candidates = titleIndex.get(songTitle);
    
    for (const art of expandedArtists) {
      for (const c of candidates) {
        const cArtist = normalizeKey(c.artist);
        if (cArtist.includes(art) || art.includes(cArtist)) {
          return c.path;
        }
      }
    }
    
    const firstInitial = songArtist[0];
    for (const c of candidates) {
      const cArtist = normalizeKey(c.artist);
      if (cArtist[0] === firstInitial) {
        const lastWordSong = normalize(song.artist).split(' ').pop().replace(/\.$/,'');
        if (lastWordSong.length > 1 && c.artist.includes(lastWordSong)) {
          return c.path;
        }
      }
    }

    if (candidates.length === 1) {
      return candidates[0].path;
    }
  }

  return null;
}

async function main() {
  const songs = await prisma.song.findMany({
    where: { lyrics: null },
    select: { id: true, title: true, artist: true },
  });

  console.log(`Found ${songs.length} songs without lyrics.\n`);
  if (songs.length === 0) { console.log('Done!'); return; }

  const fileData = buildFileIndex();

  let matched = 0;
  let notFound = 0;
  const notFoundList = [];

  const uniqueSongs = new Map();
  for (const song of songs) {
    const key = normalizeKey(song.title) + '|||' + normalizeKey(song.artist);
    if (!uniqueSongs.has(key)) uniqueSongs.set(key, []);
    uniqueSongs.get(key).push(song);
  }

  for (const [, songGroup] of uniqueSongs) {
    const rep = songGroup[0];
    const filePath = findMatch(rep, fileData);
    
    if (filePath) {
      const lyrics = readLyrics(filePath);
      if (lyrics) {
        const ids = songGroup.map(s => s.id);
        await prisma.song.updateMany({
          where: { id: { in: ids } },
          data: { lyrics },
        });
        matched++;
        if (matched <= 15) {
          console.log(`  ✓ "${rep.title}" — ${rep.artist}`);
        }
      } else {
        notFound++;
        notFoundList.push(`${rep.title} — ${rep.artist}`);
      }
    } else {
      notFound++;
      notFoundList.push(`${rep.title} — ${rep.artist}`);
    }
  }

  console.log(`\n========== RESULTS ==========`);
  console.log(`Matched & updated: ${matched}`);
  console.log(`Not found: ${notFound}`);
  
  const totalWithLyrics = await prisma.song.count({ where: { lyrics: { not: null } } });
  const totalSongs = await prisma.song.count();
  console.log(`\nTotal songs with lyrics: ${totalWithLyrics}/${totalSongs} (${Math.round(totalWithLyrics/totalSongs*100)}%)`);
  
  if (notFoundList.length > 0 && notFoundList.length <= 300) {
    console.log(`\nStill missing:`);
    notFoundList.forEach(s => console.log(`  ✗ ${s}`));
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
