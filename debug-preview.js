const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const idx = l.indexOf('=');
  if (idx > 0) {
    const k = l.substring(0, idx).trim();
    const v = l.substring(idx + 1).trim().replace(/^"|"$/g, '');
    env[k] = v;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // 1. List files in demo-songs bucket
  const { data: files, error: listErr } = await supabase.storage.from('demo-songs').list('', { limit: 20 });
  console.log('=== Files in demo-songs bucket ===');
  if (listErr) console.log('LIST ERROR:', listErr);
  else {
    files.forEach(f => console.log(' ', f.name, f.id ? '(file)' : '(folder)'));
    // Check subfolders
    for (const f of files) {
      if (!f.id) {
        const { data: sub } = await supabase.storage.from('demo-songs').list(f.name, { limit: 20 });
        if (sub) sub.forEach(s => console.log('   ', f.name + '/' + s.name));
      }
    }
  }

  // 2. Try to generate signed URL for the actual previewPath from DB
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const songs = await prisma.demoSong.findMany({ select: { id: true, title: true, previewPath: true, isActive: true } });
  console.log('\n=== Songs in DB ===');
  for (const s of songs) {
    console.log(`  ${s.title} | previewPath: "${s.previewPath}" | active: ${s.isActive}`);
    if (s.previewPath) {
      const { data, error } = await supabase.storage.from('demo-songs').createSignedUrl(s.previewPath, 300);
      if (error) console.log('    SIGNED URL ERROR:', error.message);
      else console.log('    SIGNED URL OK, length:', data.signedUrl.length);
    }
  }
  await prisma.$disconnect();
}

main().catch(e => console.error(e));
