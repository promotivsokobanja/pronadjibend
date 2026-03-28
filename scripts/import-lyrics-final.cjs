const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

const PESMARICA_ROOT = path.join(process.env.USERPROFILE || 'C:\\Users\\Studios', 'Desktop', 'Pesmarica');

const MANUAL = {
  'dolazimza5min|||generacija5': 'Dolazim za pet minuta - Generacija 5.txt',
  'cajorijesukarije|||tradicionalna': 'Cajorije - Fazlija.txt',
  'ciganinsamvoljena|||tradicionalna': 'Ciganin sam al\' najlepsi - Ljuba Alicic.txt',
  'nemojdamegledassavisine|||ribljacorba': 'Djogani Fantastiko - Nemoj da me gledas.txt',
  'avijonuslomicuti|||ribljacorba': 'Avionu, slomicu ti krila - Riblja Corba.txt',
  'avionuslomicuti|||ribljacorba': 'Avionu, slomicu ti krila - Riblja Corba.txt',
  'smejemsearlakaobih|||olivermandic': 'Oliver Mandic - Smejem se a plakao bih.txt',
  'smejemsearlakaobiselaplakaobi|||olivermandic': 'Oliver Mandic - Smejem se a plakao bih.txt',
  'cijasinist|||amadeus': 'Cija si - Tose Proeski.txt',
  'cijasinist|||amadeus': 'Cija si - Asim Bajric.txt',
  'dvaminuta|||sergejc': 'Dva minuta straha - Six Pack.txt',
  'poglediu tani|||toseproeski': 'Tose Proeski - Cija si.txt',
  'bastitilepostojeSuze|||harimatahari': null,
  'vasaladacki|||djordjebalasevic': 'Starim - Djordje Balasevic.txt',
  'kokain|||djordjebalasevic': null,
  'petao|||djordjebalasevic': null,
  'ruziceruska|||zdravkocolic': null,
  'ruzicemojaruska|||zdravkocolic': null,
};

function removeDiacritics(str) {
  const map = { 'č':'c','ć':'c','đ':'dj','š':'s','ž':'z','Č':'C','Ć':'C','Đ':'Dj','Š':'S','Ž':'Z' };
  return str.replace(/[čćđšžČĆĐŠŽ]/g, ch => map[ch] || ch);
}
function norm(s) { return removeDiacritics(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

const AM = {
  'tosep':'toseproeski','oliverd':'oliverdragojevic','acop':'acopejovic',
  'sasam':'samamatic','sasak':'sasakovacevic','zeljkos':'zeljkosamardzic',
  'zeljkoj':'zeljkojoksimovic','zeljkov':'zeljkovasic','dadop':'dadopolumenta',
  'sergejc':'sergejcetkovic','tonyc':'tonycetinski','dinom':'dinomerlin',
  'eminaj':'eminajahovic','dzenanl':'dzenanloncarevic','dorisd':'dorisdragovic',
  'gocat':'gocatrzan','halidb':'halidbeslic','halidm':'halidmuslimovic',
  'harisdz':'harisdzinovic','dzejr':'dzejramadanovski','sinans':'sinansakic',
  'sabans':'sabansaulic','ljubomirdj':'ljubomirdjukic','merlin':'dinomerlin',
  'sbajramovich':'sabanbajramovic','dzenan':'dzenanloncarevic',
};
function expandArtist(a) {
  const n = norm(a);
  const r = [n];
  if (AM[n]) r.push(AM[n]);
  const s = removeDiacritics(a).toLowerCase().replace(/\./g,'').trim().split(/\s+/);
  if (s.length >= 2 && s[s.length-1].length <= 2) r.push(norm(s.slice(0,-1).join('')));
  return [...new Set(r)];
}

let FILES = [];
function index() {
  (function walk(d) {
    let e; try { e = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const f of e) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith('.txt')) FILES.push({ name: f.name, path: p, norm: norm(f.name.replace(/\.txt$/i,'')) }); }
  })(PESMARICA_ROOT);
  console.log(`${FILES.length} files indexed`);
}

function readLyrics(fp) {
  try {
    let c; try { c = fs.readFileSync(fp, 'utf8'); } catch { c = fs.readFileSync(fp, 'latin1'); }
    c = c.replace(/^\uFEFF/,'');
    const l = c.split(/\r?\n/); let s = 0;
    for (let i = 0; i < Math.min(5, l.length); i++) if (l[i].trim() === '' && i >= 1) { s = i + 1; break; }
    const ly = l.slice(s).join('\n').trim();
    return ly.length > 10 ? ly : null;
  } catch { return null; }
}

function findByName(partialName) {
  const n = norm(partialName);
  for (const f of FILES) {
    if (f.norm.includes(n) || f.name.toLowerCase().includes(partialName.toLowerCase())) return f.path;
  }
  return null;
}

function find(title, artist) {
  const nt = norm(title);
  const arts = expandArtist(artist);
  
  for (const a of arts) {
    const key = nt + '|||' + a;
    if (MANUAL[key] !== undefined) {
      return MANUAL[key] ? findByName(MANUAL[key].replace(/\.txt$/, '')) : null;
    }
  }

  for (const a of arts) {
    for (const f of FILES) {
      if (f.norm === nt + a || f.norm === a + nt) return f.path;
    }
  }

  if (nt.length >= 6) {
    for (const a of arts) {
      if (a.length < 3) continue;
      for (const f of FILES) {
        const fnParts = f.name.replace(/\.txt$/i,'').split(' - ');
        if (fnParts.length < 2) continue;
        const fTitle = norm(fnParts[0]);
        const fArtist = norm(fnParts.slice(1).join(' '));
        if (fTitle.includes(nt) && fArtist.includes(a.slice(0,5))) return f.path;
        if (fArtist.includes(nt) && fTitle.includes(a.slice(0,5))) return f.path;
      }
    }
  }

  if (nt.length >= 12) {
    for (const f of FILES) {
      if (f.norm.includes(nt)) return f.path;
    }
  }

  return null;
}

async function main() {
  const songs = await prisma.song.findMany({ where: { lyrics: null }, select: { id:true, title:true, artist:true } });
  console.log(`${songs.length} songs without lyrics`);
  if (!songs.length) return;
  index();

  const groups = new Map();
  for (const s of songs) {
    const k = norm(s.title) + '|||' + norm(s.artist);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  }

  let matched = 0, missed = 0;
  for (const [, g] of groups) {
    const r = g[0];
    const fp = find(r.title, r.artist);
    if (fp) {
      const ly = readLyrics(fp);
      if (ly) {
        await prisma.song.updateMany({ where: { id: { in: g.map(s=>s.id) } }, data: { lyrics: ly } });
        matched++;
        console.log(`  ✓ "${r.title}" — ${r.artist}`);
        continue;
      }
    }
    missed++;
  }

  const total = await prisma.song.count();
  const withL = await prisma.song.count({ where: { lyrics: { not: null } } });
  console.log(`\nThis pass: +${matched}`);
  console.log(`TOTAL: ${withL}/${total} (${Math.round(withL/total*100)}%)`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
