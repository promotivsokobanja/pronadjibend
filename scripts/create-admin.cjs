/**
 * Kreira ili ažurira admin nalog (role ADMIN).
 * U .env.local postavite ADMIN_EMAIL i ADMIN_PASSWORD, zatim:
 *   node scripts/create-admin.cjs
 * Potreban je DATABASE_URL.
 */
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = join(process.cwd(), f);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, 'utf8');
    for (const line of text.split(/\r?\n/)) {
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
      if (process.env[key] === undefined) process.env[key] = val;
    }
    break;
  }
}

loadEnv();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('Postavite ADMIN_EMAIL i ADMIN_PASSWORD u okruženju ili .env.local.');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('Nedostaje DATABASE_URL.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const hash = await bcrypt.hash(password, 10);
  const em = email.toLowerCase().trim();

  try {
    await prisma.user.upsert({
      where: { email: em },
      create: {
        email: em,
        password: hash,
        role: 'ADMIN',
      },
      update: {
        role: 'ADMIN',
        password: hash,
      },
    });
    console.log('Admin nalog je spreman:', em);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
