const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const SUPABASE_URL = 'https://oplxnytgxqabhqtdfnsa.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbHhueXRneHFhYmhxdGRmbnNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY4NTI5OCwiZXhwIjoyMDkwMjYxMjk4fQ.nd5pI-u7LlkGglejGPeEp1THVO7AgGvvxtGt_dS1mzY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const MIDI_ROOT = path.join(
  process.env.USERPROFILE || 'C:\\Users\\Studios',
  'Desktop',
  'MIDI FAJLOVI SREDJENI'
);

const BUCKET = 'midi';
const CONCURRENCY = 5;

const CATEGORY_MAP = {
  'ZABAVNA': 'Zabavna',
  'NARODNA': 'Narodna',
  'KOLA': 'Kola',
  'MIXEVI': 'Mixevi',
  'DECIJE': 'Decije',
};

async function createBucket() {
  console.log('Creating storage bucket...');
  const { data, error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 10485760, // 10MB
  });
  if (error && !error.message.includes('already exists')) {
    console.error('Bucket error:', error.message);
  } else {
    console.log('Bucket ready.\n');
  }
}

function collectFiles() {
  console.log('Scanning MIDI folder...');
  const files = [];

  for (const [folder, category] of Object.entries(CATEGORY_MAP)) {
    const folderPath = path.join(MIDI_ROOT, folder);
    if (!fs.existsSync(folderPath)) continue;

    function walk(dir, artistOverride) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fp = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fp, entry.name);
        } else if (entry.name.match(/\.(mid|kar)$/i)) {
          const fileName = entry.name;
          const title = fileName.replace(/\.(mid|kar)$/i, '').trim();
          const artist = artistOverride || folder;
          const relativePath = `${category}/${artist}/${fileName}`.replace(/\s+/g, '_');

          files.push({
            title,
            artist,
            category,
            fileName,
            filePath: relativePath,
            fullPath: fp,
            fileSize: fs.statSync(fp).size,
          });
        }
      }
    }

    walk(folderPath, null);
  }

  console.log(`Found ${files.length} MIDI files.\n`);
  return files;
}

async function uploadBatch(files, startIdx) {
  const promises = files.map(async (file, i) => {
    const idx = startIdx + i;
    try {
      const fileBuffer = fs.readFileSync(file.fullPath);

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(file.filePath, fileBuffer, {
          contentType: 'audio/midi',
          upsert: true,
        });

      if (error) {
        console.error(`  ✗ [${idx}] ${file.fileName}: ${error.message}`);
        return null;
      }

      await prisma.midiFile.create({
        data: {
          title: file.title,
          artist: file.artist,
          category: file.category,
          fileName: file.fileName,
          filePath: file.filePath,
          fileSize: file.fileSize,
        },
      });

      return true;
    } catch (err) {
      console.error(`  ✗ [${idx}] ${file.fileName}: ${err.message}`);
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter(Boolean).length;
}

async function main() {
  await createBucket();
  const files = collectFiles();

  if (files.length === 0) {
    console.log('No files found.');
    return;
  }

  const existing = await prisma.midiFile.count();
  console.log(`Already in DB: ${existing}`);

  if (existing > 0) {
    console.log('Clearing existing entries for clean re-import...');
    await prisma.midiFile.deleteMany();
  }

  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const count = await uploadBatch(batch, i);
    uploaded += count;
    failed += batch.length - count;

    if ((i + CONCURRENCY) % 100 < CONCURRENCY) {
      console.log(`  Progress: ${Math.min(i + CONCURRENCY, files.length)}/${files.length} (${uploaded} OK, ${failed} failed)`);
    }
  }

  const catCounts = await prisma.midiFile.groupBy({
    by: ['category'],
    _count: true,
  });

  console.log('\n========== GOTOVO ==========');
  console.log(`Uploadovano: ${uploaded}`);
  console.log(`Neuspešno: ${failed}`);
  console.log('\nPo kategorijama:');
  catCounts.forEach(c => console.log(`  ${c.category}: ${c._count}`));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
