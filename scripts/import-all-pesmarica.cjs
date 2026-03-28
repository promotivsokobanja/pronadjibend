const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const PESMARICA_ROOT = path.join(
  process.env.USERPROFILE || 'C:\\Users\\Studios',
  'Desktop',
  'Pesmarica'
);

const BATCH_SIZE = 80;

// ========== ARTIST CATEGORIZATION ==========

const NARODNE_ARTISTS = [
  'saban saulic','sinan sakic','halid beslic','halid muslimovic','dzej ramadanovski',
  'mile kitic','dragana mirkovic','ceca raznatovic','ceca','aca lukas','lepa brena',
  'sasa matic','seka aleksic','jelena karleusa','dara bubamara','indira radic',
  'neda ukraden','vesna zmijanac','snezana djurisic','merima njegomir','zorica brunclik',
  'fahreta jahic','hanka paldum','kemal monteno','safet isovic','himzo polovina',
  'bora drljaca','toma zdravkovic','silvana armenulic','marinko rokvic','miroslav ilic',
  'predrag zivkovic tozovac','tozovac','tose proeski','predrag cune gojkovic',
  'zvonko bogdan','jasar ahmedovski','nihad kantic sike','haris dzinovic',
  'esad plavi','saban bajramovic','muharem serbezovski','ljuba alicic','vida pavlovic',
  'gordana stojicevic','nedeljko bilkic','meho puzic','nada topciagic','nada mamula',
  'sneki','davor badrov','darko lazic','aca pejovic','jovan perisic',
  'sejo kalac','dzenan loncarevic','amar gile jasarspahic','serif konjevic',
  'osman hadzic','hari mata hari','baja mali knindza','mitar miric','stojan',
  'suzana jovanovic','buba miranovic','zlata petrovic','viki miljkovic',
  'stoja','natasa bekvalac','natasa djordjevic','nikolija','maya berovic',
  'jelena brocic','milica pavlovic','aleksandra prijovic','cobi','sasa kapor',
  'dado polumenta','nemanja stevanovic','adil handzic','fazlija','nihad fetic',
  'enes begovic','hasim kucuk hoki','asim bajric','amir kazic leo',
  'elvira rahic','zehra bajraktarevic','sejo sexon','alma','mirso filipovic',
  'zeljko sasic','savo radusinovic','bata zdravkovic','rosa','stanojka bodiroza',
  'novica negovanovic','dragan jovanovic','goca bozinovska','esma redzepova',
  'usnija redzepova','saban','sinan','halid','dzej','mile','dragana','brena',
  'narodna','tradicionalna','popularna',
];

const STRANE_ARTISTS = [
  'abba','ac/dc','acdc','adele','aerosmith','alanis morissette','alannah myles',
  'andrea bocelli','aretha franklin','backstreet boys','bangles','barbra streisand',
  'beatles','bee gees','beyonce','billy joel','billy idol','bob dylan','bob marley',
  'bon jovi','bonnie tyler','bryan adams','carole king','celine dion','cher',
  'chris rea','coldplay','creedence','cyndi lauper','deep purple','depeche mode',
  'diana ross','dire straits','donna summer','doors','duran duran','eagles',
  'ed sheeran','elton john','elvis presley','eminem','eric clapton','eurythmics',
  'fleetwood mac','frank sinatra','fugees','george michael','gloria gaynor',
  'green day','guns n roses','imagine dragons','inxs','james blunt','james brown',
  'janis joplin','jennifer lopez','jimi hendrix','john lennon','johnny cash',
  'journey','justin timberlake','kansas','led zeppelin','lenny kravitz',
  'lionel richie','madonna','mariah carey','maroon 5','metallica','michael jackson',
  'nelly furtado','nirvana','oasis','pearl jam','phil collins','pink','pink floyd',
  'pointer sisters','police','prince','queen','r.e.m.','radiohead','red hot chili peppers',
  'rihanna','robbie williams','rolling stones','roxette','roy orbison',
  'sade','scorpions','shakira','shania twain','simply red','sinead oconnor',
  'smokie','sting','tina turner','tom jones','toni braxton','toto','toto cutugno',
  'u2','vaya con dios','wham','whitney houston','wonderwall','stevie wonder',
  'louis armstrong','ella fitzgerald','ray charles','amy winehouse','bruno mars',
  'the weeknd','lady gaga','katy perry','taylor swift','sam smith','john legend',
  'alicia keys','norah jones','michael buble','andrea bocelli','luciano pavarotti',
  'eros ramazzotti','laura pausini','al bano','romina power','ricchi e poveri',
  'umberto tozzi','adriano celentano','domenico modugno','dalida',
];

const ZABAVNE_ARTISTS = [
  'zdravko colic','djordje balasevic','oliver dragojevic','oliver mandic',
  'miso kovac','bijelo dugme','riblja corba','bajaga','parni valjak',
  'prljavo kazaliste','azra','zabraneno pusenje','zabranjeno pusenje',
  'indexi','yu grupa','generacija 5','galija','smak','atomsko skloniste',
  'buldozer','plavi orkestar','ekatarina velika','ekv','idoli','film',
  'haustor','leb i sol','aerodrom','divlje jagode','kerber','gordi',
  'van gogh','s.a.r.s.','sars','nipplepeople','dubioza kolektiv',
  'hladno pivo','let 3','tbf','elemental','urban','massimo','gibonni',
  'thompson','severina','jelena rozga','tony cetinski','petar graso',
  'doris dragovic','tereza kesovija','josipa lisac','meri cetinic',
  'arsen dedic','gabi novak','vice vukov','ivo robic','krunoslav kico slabinac',
  'vlado georgiev','sergej cetkovic','zeljko joksimovic','zeljko samardzic',
  'aleksandra radovic','nina badric','jelena tomasevic','knez','emina jahovic',
  'dino merlin','zeljko bebek','goran bregovic','dado topic','aki rahimovski',
  'davorin popovic','momcilo bajagic bajaga','bora djordjevic',
  'novi fosili','magazin','colonia','daleka obala','et','srebrna krila',
  'tajci','danijela martinovic','neno belan','mladen vojicic tifa','tifa',
  'oktobar 1864','gordi','balasevic','colic','dragojevic','mandic',
  'kovac','cetinski','graso','dragovic','joksimovic','badric','georgiev',
  'cetkovic','radovic','tomasevic','merlin','bebek','bregovic',
  'lexington','tropico band','funky g','flamingosi','koktel bend',
  'neki to vole vruce','cod','bisera veletanlic','goca trzan',
  'igor vukojevic','marko kon','laka','toše proeski','zana',
  'jadranka stojkovic','jadranka stojakovic',
];

function norm(str) {
  const map = {'č':'c','ć':'c','đ':'dj','š':'s','ž':'z','Č':'C','Ć':'C','Đ':'Dj','Š':'S','Ž':'Z'};
  return (str || '').replace(/[čćđšžČĆĐŠŽ]/g, ch => map[ch] || ch).toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function categorize(artist) {
  const n = norm(artist);

  for (const a of STRANE_ARTISTS) {
    if (n.includes(a) || a.includes(n)) return 'Strane';
  }

  for (const a of NARODNE_ARTISTS) {
    if (n.includes(a) || a.includes(n)) return 'Narodne';
  }

  for (const a of ZABAVNE_ARTISTS) {
    if (n.includes(a) || a.includes(n)) return 'Zabavne';
  }

  const intlPatterns = /\b(the |love |my |you |baby |night |dream |heart |kiss |fire |sweet |don't|dont|blues|rock |soul )/i;
  if (intlPatterns.test(artist)) return 'Strane';

  return 'Zabavne';
}

function readLyrics(filePath) {
  try {
    let content;
    try { content = fs.readFileSync(filePath, 'utf8'); }
    catch { content = fs.readFileSync(filePath, 'latin1'); }
    content = content.replace(/^\uFEFF/, '');
    const lines = content.split(/\r?\n/);
    let startIdx = 0;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      if (lines[i].trim() === '' && i >= 1) { startIdx = i + 1; break; }
    }
    const lyrics = lines.slice(startIdx).join('\n').trim();
    return lyrics.length > 10 ? lyrics : null;
  } catch { return null; }
}

function normalizeKey(str) {
  return norm(str).replace(/\s/g, '');
}

function collectFiles() {
  console.log('Scanning Pesmarica folder...');
  const files = [];
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const fp = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fp);
      else if (entry.name.toLowerCase().endsWith('.txt')) {
        const base = entry.name.replace(/\.txt$/i, '');
        const parts = base.split(' - ');
        if (parts.length >= 2) {
          const p1 = parts[0].trim();
          const p2 = parts.slice(1).join(' - ').trim();
          if (p1.length > 0 && p2.length > 0) {
            files.push({ title: p1, artist: p2, path: fp });
          }
        }
      }
    }
  }
  walk(PESMARICA_ROOT);
  console.log(`Found ${files.length} .txt files.\n`);
  return files;
}

async function main() {
  const files = collectFiles();

  const deduped = new Map();
  for (const f of files) {
    const key = normalizeKey(f.title) + '|||' + normalizeKey(f.artist);
    if (!deduped.has(key)) deduped.set(key, f);
  }
  console.log(`Unique title/artist: ${deduped.size}`);

  const toInsert = [];
  let skipped = 0;
  const catCounts = { Narodne: 0, Zabavne: 0, Strane: 0 };

  for (const [, file] of deduped) {
    const lyrics = readLyrics(file.path);
    if (!lyrics) { skipped++; continue; }

    const cat = categorize(file.artist);
    catCounts[cat]++;

    toInsert.push({
      title: file.title,
      artist: file.artist,
      lyrics,
      category: cat,
      type: cat,
      bandId: null,
    });
  }

  toInsert.sort((a, b) => a.title.localeCompare(b.title, 'sr'));

  console.log(`\nTo insert: ${toInsert.length}`);
  console.log(`  Narodne: ${catCounts.Narodne}`);
  console.log(`  Zabavne: ${catCounts.Zabavne}`);
  console.log(`  Strane: ${catCounts.Strane}`);
  console.log(`  Skipped (no lyrics): ${skipped}\n`);

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    try {
      const result = await prisma.song.createMany({ data: batch, skipDuplicates: true });
      inserted += result.count;
    } catch (err) {
      console.error(`Batch error at ${i}:`, err.message);
      for (const song of batch) {
        try { await prisma.song.create({ data: song }); inserted++; } catch { /* skip */ }
      }
    }
    if ((i + BATCH_SIZE) % 2000 < BATCH_SIZE) {
      console.log(`  ${Math.min(i + BATCH_SIZE, toInsert.length)}/${toInsert.length} ... (${inserted} inserted)`);
    }
  }

  const total = await prisma.song.count();
  const global = await prisma.song.count({ where: { bandId: null } });

  console.log(`\n========== GOTOVO ==========`);
  console.log(`Ubaceno: ${inserted}`);
  console.log(`Ukupno u bazi: ${total}`);
  console.log(`Globalna pesmarica: ${global}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
