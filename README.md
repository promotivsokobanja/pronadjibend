# Pronađi Bend (Next.js)

Javni sajt: **[pronadjibend.rs](https://pronadjibend.rs)**

## Deploy

- **Hosting:** Netlify (`netlify.toml`, `@netlify/plugin-nextjs`).
- **Build:** `npx prisma migrate deploy && npm run build:clean` — u Netlify **Environment variables** obavezno stavi **`DATABASE_URL`**, **`NEXTAUTH_URL`**, **`NEXTAUTH_SECRET`** (ostalo vidi `.env.example`).
- **GitHub:** ako desni sidebar i dalje prikazuje crvene „Deployments“ (npr. stari Vercel), a deploy radi samo preko Netlifyja: repozitorijum → **Settings** → **Installed GitHub Apps** → ukloni/onemogući **Vercel** za ovaj repo; **About** → polje *Website* postavi na `https://pronadjibend.rs`.

## Lokalno

```bash
cp .env.example .env.local
docker compose up -d
npx prisma migrate deploy
npm run dev
```

## CI

Na `main`: GitHub Actions (`.github/workflows/ci.yml`) — `npm ci`, Prisma, ESLint, `next build`.
