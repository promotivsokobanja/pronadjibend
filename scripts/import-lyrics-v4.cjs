const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const PESMARICA_ROOT = path.join(
  process.env.USERPROFILE || 'C:\\Users\\Studios',
  'Desktop',
  'Pesmarica'
);

const MANUAL_MAP = {
  'lazulazume|||bijelodugme': 'LAZU LAZU ME',
  'dodjavolave|||oliverdragojevic': 'Dodjavola',
  'dodjavolasve|||oliverdragojevic': 'Dodjavola',
  'starimja|||oliverdragojevic': 'Starim - Djordje Balasevic',
  'besamemucho|||classic': 'Besame mucho',
  'besamemucho|||andreabocelli': 'Besame mucho',
  'besamomucho|||andreabocelli': 'Besame mucho',
};

function removeDiacritics(str) {
  const map = { 'č':'c','ć':'c','đ':'dj','š':'s','ž':'z','Č':'C','Ć':'C','Đ':'Dj','Š':'S','Ž':'Z' };
  return str.replace(/[čćđšžČĆĐŠŽ]/g, ch => map[ch] || ch);
}

function norm(str) {
  return removeDiacritics(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const ARTIST_MAP = {
  'tosep': 'toseproeski', 'oliverd': 'oliverdragojevic', 'acop': 'acopejovic',
  'sasam': 'samamatic', 'sasak': 'sasakovacevic', 'zeljkos': 'zeljkosamardzic',
  'zeljkoj': 'zeljkojoksimovic', 'zeljkov': 'zeljkovasic', 'dadop': 'dadopolumenta',
  'sergejc': 'sergejcetkovic', 'tonyc': 'tonycetinski', 'dinom': 'dinomerlin',
  'eminaj': 'eminajahovic', 'dzenanl': 'dzenanloncarevic', 'dorisd': 'dorisdragovic',
  'gocat': 'gocatrzan', 'halidb': 'halidbeslic', 'halidm': 'halidmuslimovic',
  'harisdz': 'harisdzinovic', 'dzejr': 'dzejramadanovski', 'sinans': 'sinansakic',
  'sabans': 'sabansaulic', 'ljubomirdj': 'ljubomirdjukic', 'merlin': 'dinomerlin',
  'bebek': 'zeljkobebek', 'sbajramovich': 'sabanbajramovic',
};

function expandArtist(artist) {
  const n = norm(artist);
  const r = [n];
  if (ARTIST_MAP[n]) r.push(ARTIST_MAP[n]);
  const stripped = removeDiacritics(artist).toLowerCase().replace(/\./g,'').trim().split(/\s+/);
  if (stripped.length >= 2 && stripped[stripped.length-1].length <= 2) {
    r.push(norm(stripped.slice(0,-1).join('')));
  }
  return [...new Set(r)];
}

let ALL_FILES = [];
function indexFiles() {
  function walk(dir) {
    let e;
    try { e = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const f of e) {
      const fp = path.join(dir, f.name);
      if (f.isDirectory()) walk(fp);
      else if (f.name.endsWith('.txt')) ALL_FILES.push({ name: f.name, path: fp, norm: norm(f.name.replace(/\.txt$/i,'')) });
    }
  }
  walk(PESMARICA_ROOT);
  console.log(`Indexed ${ALL_FILES.length} files`);
}

function readLyrics(fp) {
  try {
    let c;
    try { c = fs.readFileSync(fp, 'utf8'); } catch { c = fs.readFileSync(fp, 'latin1'); }
    c = c.replace(/^\uFEFF/,'');
    const lines = c.split(/\r?\n/);
    let s = 0;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      if (lines[i].trim() === '' && i >= 1) { s = i + 1; break; }
    }
    const lyrics = lines.slice(s).join('\n').trim();
    return lyrics.length > 10 ? lyrics : null;
  } catch { return null; }
}

function findFile(title, artist) {
  const nt = norm(title);
  const arts = expandArtist(artist);

  for (const [key, fileName] of Object.entries(MANUAL_MAP)) {
    const combined = nt + '|||' + arts[0];
    if (combined === key || (arts[1] && nt + '|||' + arts[1] === key)) {
      const found = ALL_FILES.find(f => f.name.toLowerCase().includes(fileName.toLowerCase()));
      if (found) return found.path;
    }
  }

  for (const a of arts) {
    for (const f of ALL_FILES) {
      if (f.norm === nt + a || f.norm === a + nt) return f.path;
    }
  }

  if (nt.length >= 8) {
    for (const a of arts) {
      for (const f of ALL_FILES) {
        if (f.norm.includes(nt) && (a.length < 4 || f.norm.includes(a.slice(0,4)))) return f.path;
      }
    }
  }

  if (nt.length >= 10) {
    for (const f of ALL_FILES) {
      if (f.norm.includes(nt)) return f.path;
    }
  }

  return null;
}

async function main() {
  const songs = await prisma.song.findMany({ where: { lyrics: null }, select: { id:true, title:true, artist:true } });
  console.log(`Songs without lyrics: ${songs.length}`);
  if (!songs.length) return;

  indexFiles();

  const groups = new Map();
  for (const s of songs) {
    const k = norm(s.title) + '|||' + norm(s.artist);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  }

  let matched = 0, missed = 0;
  const missList = [];

  for (const [, g] of groups) {
    const r = g[0];
    const fp = findFile(r.title, r.artist);
    if (fp) {
      const lyrics = readLyrics(fp);
      if (lyrics) {
        await prisma.song.updateMany({ where: { id: { in: g.map(s=>s.id) } }, data: { lyrics } });
        matched++;
        console.log(`  ✓ "${r.title}" — ${r.artist} → ${path.basename(fp)}`);
        continue;
      }
    }
    missed++;
    missList.push(`${r.title} — ${r.artist}`);
  }

  const total = await prisma.song.count();
  const withL = await prisma.song.count({ where: { lyrics: { not: null } } });
  console.log(`\n=== FINAL ===`);
  console.log(`This pass: +${matched}, missed: ${missed}`);
  console.log(`Total: ${withL}/${total} (${Math.round(withL/total*100)}%)`);
  console.log(`\nStill missing (${missList.length}):`);
  missList.forEach(s => console.log(`  ✗ ${s}`));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
