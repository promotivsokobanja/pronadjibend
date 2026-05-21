# Setup na drugom računaru

## Brzi start

```bash
# 1. Kloniraj repo (ili kopiraj ceo folder)
git clone https://github.com/promotivsokobanja/pronadjibend.git
cd pronadjibend

# 2. Kopiraj .env i .env.local iz BACKUP-ENV foldera u root
cp BACKUP-ENV/.env .
cp BACKUP-ENV/.env.local .

# 3. Instaliraj dependencies
npm install

# 4. Generiši Prisma klijent
npx prisma generate

# 5. Pokreni dev server
npx next dev -p 3000
```

## Preduslovi

- **Node.js** v18+ (testirano na v24.14.1)
- **npm** v9+
- **Git** instaliran
- Internet konekcija (baza je na Neon cloud)

## Važni fajlovi (NISU u git-u!)

| Fajl | Opis |
|------|------|
| `.env` | Database URL, Stripe keys, SMTP, Cloudinary |
| `.env.local` | NEXTAUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, JWT_SECRET |

Ovi fajlovi su kopirani u **BACKUP-ENV/** folder unutar projekta.

## Korisni nalozi

- **GitHub:** github.com/promotivsokobanja/pronadjibend (branch: main)
- **Baza:** Neon PostgreSQL (connection string u .env)
- **Hosting:** Netlify (auto-deploy sa main branch)

## Komande

| Akcija | Komanda |
|--------|---------|
| Dev server | `npx next dev -p 3000` |
| Build | `npx next build` |
| Prisma studio | `npx prisma studio` |
| Push schema | `npx prisma db push` |
| Generate client | `npx prisma generate` |

## Napomene

- Nikad ne commituj `.env` ili `.env.local` u git
- Pre push-a uvek uradi `npx next build` da proveriš greške
- Baza je cloud (Neon) — ne treba lokalna instalacija PostgreSQL-a
