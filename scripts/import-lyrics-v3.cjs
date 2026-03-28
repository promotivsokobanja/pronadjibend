const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const PESMARICA_ROOT = path.join(
  process.env.USERPROFILE || 'C:\\Users\\Studios',
  'Desktop',
  'Pesmarica'
);

const ARTIST_MAP = {
  'tose p': 'tose proeski',
  'oliver d': 'oliver dragojevic',
  'aco p': 'aco pejovic',
  'sasa m': 'sasa matic',
  'sasa k': 'sasa kovacevic',
  'zeljko s': 'zeljko samardzic',
  'zeljko j': 'zeljko joksimovic',
  'zeljko v': 'zeljko vasic',
  'dado p': 'dado polumenta',
  'sergej c': 'sergej cetkovic',
  'tony c': 'tony cetinski',
  'dino m': 'dino merlin',
  'emina j': 'emina jahovic',
  'dzenan l': 'dzenan loncarevic',
  'doris d': 'doris dragovic',
  'goca t': 'goca trzan',
  'halid b': 'halid beslic',
  'halid m': 'halid muslimovic',
  'haris dz': 'haris dzinovic',
  'dzej r': 'dzej ramadanovski',
  'sinan s': 'sinan sakic',
  'saban s': 'saban saulic',
  'ljubomir dj': 'ljubomir djukic',
  'merlin': 'dino merlin',
  'bebek': 'zeljko bebek',
  'dzej': 'dzej ramadanovski',
  'cira': 'cira sekulic',
  'luis': 'luis',
};

const TITLE_ALIASES = {
  'ruzice moja ruska': ['ruzice ruska', 'ruzica moja ruska'],
  'pesma lagana': ['pjesma lagana'],
  'smijehom strah': ['smjehom strah'],
  'zenica bluz': ['zenica blues'],
  'starim ja': ['starim ja'],
  'stranac u noci': ['stranac u noci'],
  'jorgovani': ['jorgovani'],
  'pusti modu': ['pusti modu'],
  'cuskije': ['cuskije'],
  'besamo mucho': ['besame mucho'],
  'la sate mi kantare': ['lasciatemi cantare', 'lasate mi cantare'],
  'zeni nam se vukota': ['vukota'],
  'vasa ladacki': ['vasa ladacki'],
};

function removeDiacritics(str) {
  const map = {
    'č': 'c', 'ć': 'c', 'đ': 'dj', 'š': 's', 'ž': 'z',
    'Č': 'C', 'Ć': 'C', 'Đ': 'Dj', 'Š': 'S', 'Ž': 'Z',
  };
  return str.replace(/[čćđšžČĆĐŠŽ]/g, (ch) => map[ch] || ch);
}

function norm(str) {
  return removeDiacritics(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

let ALL_FILES = [];

function indexAllFiles() {
  console.log('Indexing all .txt files...');
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const fp = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fp);
      else if (entry.name.endsWith('.txt')) {
        const base = entry.name.replace(/\.txt$/i, '');
        ALL_FILES.push({ base, path: fp, norm: norm(base) });
      }
    }
  }
  walk(PESMARICA_ROOT);
  console.log(`Indexed ${ALL_FILES.length} .txt files.\n`);
}

function expandArtist(artist) {
  const n = norm(artist);
  const results = [n];
  
  for (const [short, long] of Object.entries(ARTIST_MAP)) {
    if (n === norm(short)) results.push(norm(long));
  }

  const stripped = removeDiacritics(artist || '').toLowerCase().replace(/\./g, '').trim();
  const parts = stripped.split(/\s+/);
  if (parts.length >= 2 && parts[parts.length - 1].length <= 2) {
    results.push(norm(parts.slice(0, -1).join(' ')));
  }
  
  return [...new Set(results)];
}

function expandTitle(title) {
  const n = norm(title);
  const results = [n];
  for (const [key, aliases] of Object.entries(TITLE_ALIASES)) {
    if (n === norm(key)) {
      aliases.forEach(a => results.push(norm(a)));
    }
  }
  return [...new Set(results)];
}

function findFile(song) {
  const titles = expandTitle(song.title);
  const artists = expandArtist(song.artist);
  const isGeneric = ['narodna', 'tradicionalna', 'pop', 'zabavna', 'popularna', 'zenskapop', 'classic'].includes(norm(song.artist));

  for (const t of titles) {
    for (const a of artists) {
      for (const f of ALL_FILES) {
        if (f.norm === t + a || f.norm === a + t) return f.path;
      }
    }
  }

  for (const t of titles) {
    for (const a of artists) {
      for (const f of ALL_FILES) {
        if (f.norm.includes(t) && f.norm.includes(a)) return f.path;
      }
    }
  }

  if (isGeneric) {
    for (const t of titles) {
      if (t.length < 5) continue;
      for (const f of ALL_FILES) {
        if (f.norm.includes(t) && f.base.includes(' - ')) return f.path;
      }
    }
  }

  for (const t of titles) {
    if (t.length < 6) continue;
    const lastName = artists[0].slice(-5);
    if (lastName.length < 4) continue;
    for (const f of ALL_FILES) {
      if (f.norm.includes(t) && f.norm.includes(lastName)) return f.path;
    }
  }

  return null;
}

function readLyrics(filePath) {
  try {
    let content;
    try { content = fs.readFileSync(filePath, 'utf8'); }
    catch { content = fs.readFileSync(filePath, 'latin1'); }
    content = content.replace(/^\uFEFF/, '');
    const lines = content.split(/\r?\n/);
    let start = 0;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      if (lines[i].trim() === '' && i >= 1) { start = i + 1; break; }
    }
    const lyrics = lines.slice(start).join('\n').trim();
    return lyrics.length > 10 ? lyrics : null;
  } catch { return null; }
}

async function main() {
  const songs = await prisma.song.findMany({
    where: { lyrics: null },
    select: { id: true, title: true, artist: true },
  });
  console.log(`Songs without lyrics: ${songs.length}\n`);
  if (songs.length === 0) return;

  indexAllFiles();

  const groups = new Map();
  for (const s of songs) {
    const k = norm(s.title) + '|||' + norm(s.artist);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  }

  let matched = 0, missed = 0;
  const missList = [];

  for (const [, g] of groups) {
    const rep = g[0];
    const fp = findFile(rep);
    if (fp) {
      const lyrics = readLyrics(fp);
      if (lyrics) {
        await prisma.song.updateMany({
          where: { id: { in: g.map(s => s.id) } },
          data: { lyrics },
        });
        matched++;
        if (matched <= 20) console.log(`  ✓ "${rep.title}" — ${rep.artist}`);
        continue;
      }
    }
    missed++;
    missList.push(`${rep.title} — ${rep.artist}`);
  }

  const total = await prisma.song.count();
  const withLyrics = await prisma.song.count({ where: { lyrics: { not: null } } });
  console.log(`\n========== FINAL ==========`);
  console.log(`This pass: ${matched} matched, ${missed} missed`);
  console.log(`Total: ${withLyrics}/${total} songs have lyrics (${Math.round(withLyrics/total*100)}%)\n`);

  if (missList.length <= 300) {
    console.log('Still missing:');
    missList.forEach(s => console.log(`  ✗ ${s}`));
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
