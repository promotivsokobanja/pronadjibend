/**
 * Pun backup: izvorni kod (git archive), PostgreSQL dump (pg_dump ako postoji),
 * JSON izvoz svih tabela preko Prisma (rezerva), manifest za spoljne servise.
 *
 * Pokretanje iz korena projekta:
 *   node scripts/full-backup.cjs
 *   npm run backup:full
 *
 * Zahteva .env.local sa DATABASE_URL za bazu. Bez pg_dump i dalje radi JSON izvoz.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');

function loadEnvLocal() {
  const p = path.join(root, '.env.local');
  if (!fs.existsSync(p)) return {};
  const env = {};
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function log(...a) {
  console.log('[backup]', ...a);
}

async function main() {
  const envLocal = loadEnvLocal();
  for (const [k, v] of Object.entries(envLocal)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }

  const outDir = path.join(root, 'backups', `backup-${stamp()}`);
  fs.mkdirSync(outDir, { recursive: true });
  log('Izlaz:', outDir);

  const report = [];

  // 1) Izvorni kod (sve što je u git-u, bez necommitovanih izmena u arhivi)
  const zipPath = path.join(outDir, 'source-code-from-git.zip');
  const git = spawnSync(
    'git',
    ['-C', root, 'archive', '--format=zip', '-o', zipPath, 'HEAD'],
    { encoding: 'utf8' }
  );
  if (git.status !== 0) {
    report.push(`git archive: greška — ${git.stderr || git.stdout}`);
    log('git archive nije uspeo (da li je ovo git repo?).');
  } else {
    const st = fs.statSync(zipPath);
    report.push(`source-code-from-git.zip (${Math.round(st.size / 1024)} KB)`);
    log('Arhiva koda:', zipPath);
  }

  const porc = spawnSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' });
  const dirtyPath = path.join(outDir, 'git-necommitovano.txt');
  fs.writeFileSync(
    dirtyPath,
    (porc.stdout && porc.stdout.trim()) || '(nema lokalnih izmena u odnosu na HEAD)',
    'utf8'
  );
  report.push('git-necommitovano.txt (šta nije u ZIP-u)');
  log('Status radnog stabla →', dirtyPath);

  // 2) pg_dump (format custom — pg_restore)
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    report.push('pg_dump: preskočeno (nema DATABASE_URL u .env.local)');
    log('Nema DATABASE_URL — preskačem pg_dump.');
  } else {
    const dumpPath = path.join(outDir, 'database.dump');
    const pg = spawnSync('pg_dump', [dbUrl, '-Fc', '-f', dumpPath], {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });
    if (pg.status !== 0) {
      const msg = (pg.stderr || pg.stdout || 'unknown').slice(0, 500);
      report.push(`pg_dump: nije uspelo (${msg})`);
      log('pg_dump nije uspeo (instaliraj PostgreSQL client tools ili ignoriši ako imaš JSON).');
      try {
        fs.unlinkSync(dumpPath);
      } catch {
        /* */
      }
    } else {
      const st = fs.statSync(dumpPath);
      report.push(`database.dump (${Math.round(st.size / 1024)} KB)`);
      log('pg_dump:', dumpPath);
    }
  }

  // 3) Prisma JSON (redosled po FK)
  const jsonPath = path.join(outDir, 'database-export.json');
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const data = {
      exportedAt: new Date().toISOString(),
      bands: await prisma.band.findMany(),
      users: await prisma.user.findMany(),
      songs: await prisma.song.findMany(),
      reviews: await prisma.review.findMany(),
      busyDates: await prisma.busyDate.findMany(),
      bookings: await prisma.booking.findMany(),
      liveRequests: await prisma.liveRequest.findMany(),
      midiFiles: await prisma.midiFile.findMany(),
      billingEvents: await prisma.billingEvent.findMany(),
      siteConfig: await prisma.siteConfig.findMany(),
    };
    await prisma.$disconnect();
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
    const st = fs.statSync(jsonPath);
    report.push(`database-export.json (${Math.round(st.size / 1024)} KB)`);
    log('JSON izvoz:', jsonPath);
  } catch (e) {
    report.push(`JSON izvoz: greška — ${e.message}`);
    log('Prisma izvoz greška:', e.message);
  }

  // 4) Manifest (šta ručno osigurati izvan ovog foldera)
  const manifest = `# Backup manifest — ${new Date().toISOString()}

## U ovom folderu
${report.map((r) => `- ${r}`).join('\n')}

## Pre ponovnog pokretanja za punu bazu
- U \`.env.local\` stavi **DATABASE_URL** ka pravoj bazi (npr. Neon). Za čitanje-only na Neon-u napravi **read replica** ili privremeni branch i koristi njegov URL.
- Pokreni: \`npm run backup:full\` (ili \`docker compose up -d\` pa isto za lokalni Postgres).

## Obavezno ručno (nije u git-u / nije u bazi)
- **Netlify**: Site configuration → Environment variables → kopiraj sve ključeve u bezbedan password manager (ili Netlify „Download“ ako postoji).
- **Neon / Postgres provajder**: u konzoli uključi automatske backup-e / snapshot-e; opciono „Branches“ za instant kopiju baze.
- **Cloudinary**: Media Library → po potrebi bulk download ili Cloudinary backup plan; URL-ovi fajlova su u bazi / kodu.
- **Stripe**: Dashboard → Developers → ne čuvaj tajne u repou; arhiviraj račune/Customer podatke po njihovim pravilima.
- **Google OAuth**: Google Cloud Console → Credentials (Client ID/Secret su u Netlify env).
- **Domen / DNS**: kopija podešavanja kod registrara.

## Vraćanje baze iz database.dump
\`\`\`bash
pg_restore --clean --if-exists -d "DATABASE_URL" database.dump
\`\`\`

## Vraćanje iz JSON (hitno, ručno)
Koristi skriptu ili Prisma Studio; redosled unosa: Band → User → Song → Review → BusyDate → Booking → LiveRequest → ostalo.

## Napomena
- \`source-code-from-git.zip\` odgovara **poslednjem commitu na HEAD**, ne i necommitovanim fajlovima.
- Za pun kod + lokalne izmene: \`git stash\` ili commit pre backupa.
`;

  const manifestPath = path.join(outDir, 'MANIFEST.md');
  fs.writeFileSync(manifestPath, manifest, 'utf8');
  log('Manifest:', manifestPath);
  console.log('\n--- Rezime ---\n' + report.join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
