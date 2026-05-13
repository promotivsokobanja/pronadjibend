# Pronađi Bend (Next.js)

Javni sajt: **[pronadjibend.rs](https://pronadjibend.rs)**

## Zahtevi

- **Node.js** >= 18.17 (preporučeno 20 LTS)
- **npm** >= 9
- **Docker** (za lokalnu PostgreSQL bazu) — ili konekcija na Supabase/Neon

## Pokretanje na novom računaru (korak po korak)

```bash
# 1. Kloniraj repo
git clone https://github.com/promotivsokobanja/pronadjibend.git
cd pronadjibend

# 2. Kopiraj env šablon i popuni vrednosti
cp .env.example .env.local
#    → otvori .env.local i unesi DATABASE_URL, JWT_SECRET, NEXTAUTH_SECRET
#    → za lokalni Docker Postgres: DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pronadjibend"

# 3. Pokreni lokalnu bazu (Docker)
docker compose up -d

# 4. Instaliraj dependencies (automatski radi i prisma generate)
npm install

# 5. Primeni migracije na bazu
npx prisma migrate deploy

# 6. (Opciono) Kreiraj admin korisnika
#    Dodaj ADMIN_EMAIL i ADMIN_PASSWORD u .env.local, pa:
npm run create-admin

# 7. Pokreni dev server
npm run dev
#    → otvori http://localhost:3000
```

## Struktura projekta

```
app/                  # Next.js App Router stranice i API rute
  (public)/           # Javne stranice (home, clients, bands, blog, ...)
  admin/              # Admin panel
  api/                # Serverske API rute
components/           # React komponente
lib/                  # Pomoćne biblioteke (auth, prisma, email, ...)
prisma/               # Schema i migracije
  schema.prisma       # Prisma model definicije
  migrations/         # SQL migracije (NE BRISATI)
public/               # Statički fajlovi (favicon, logo, og-image, manifest)
scripts/              # Pomoćni skriptovi (backup, import, admin)
styles/               # Globalni CSS (globals, home, navbar, footer, admin)
```

## Ključne env varijable (.env.local)

| Varijabla | Obavezna | Opis |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL konekcija |
| `JWT_SECRET` | ✅ | Min 32 karaktera, za auth-token kolačić |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` lokalno |
| `NEXTAUTH_SECRET` | ✅ | Min 32 karaktera |
| `GOOGLE_CLIENT_ID` | Za Google login | Google OAuth credentials |
| `GOOGLE_CLIENT_SECRET` | Za Google login | Google OAuth credentials |
| `CLOUDINARY_CLOUD_NAME` | Za upload slika | Cloudinary API |
| `CLOUDINARY_API_KEY` | Za upload slika | Cloudinary API |
| `CLOUDINARY_API_SECRET` | Za upload slika | Cloudinary API |
| `STRIPE_SECRET_KEY` | Za plaćanje | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Za plaćanje | Stripe webhook |
| `SMTP_HOST/PORT/USER/PASS` | Za email | SMTP server za obaveštenja |

Kompletna lista sa opisima: vidi `.env.example`

## Deploy (Netlify)

- **Hosting:** Netlify (`netlify.toml`, `@netlify/plugin-nextjs`).
- **Build:** `npx prisma migrate deploy && npm run build:clean`
- Netlify **Environment variables**: obavezno `DATABASE_URL`, `NEXTAUTH_URL=https://pronadjibend.rs`, `NEXTAUTH_SECRET` (+ ostalo iz `.env.example`).
- Push na `main` → automatski deploy.

## CI

Na `main`: GitHub Actions (`.github/workflows/ci.yml`) — `npm ci`, `npm audit`, Prisma, ESLint, `next build`.

## Korisni skriptovi

| Komanda | Opis |
|---|---|
| `npm run dev` | Dev server (localhost:3000) |
| `npm run build` | Production build |
| `npm run create-admin` | Kreiranje admin naloga |
| `npm run backup:full` | Puni backup baze |
| `npm run db:up` / `db:down` | Docker Postgres start/stop |
| `npm run security:audit` | Bezbednosna provera paketa |

## Bezbednost

Vidi [SECURITY.md](./SECURITY.md). Lokalno: `npm run security:audit`.
