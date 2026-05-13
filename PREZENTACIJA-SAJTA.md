# Pronađi Bend — Kompletna Prezentacija Platforme

**URL:** [https://pronadjibend.rs](https://pronadjibend.rs)
**Tip:** SaaS web platforma za iznajmljivanje bendova i muzičara
**Tržište:** Srbija (srpski jezik)
**Tehnologija:** Next.js 14, React 18, PostgreSQL, Prisma ORM, Stripe, Cloudinary
**Hosting:** Netlify (Edge Functions)

---

## 1. VIZIJA I MISIJA

**Pronađi Bend** je prva srpska digitalna platforma koja povezuje klijente koji traže živu muziku za svoje događaje (svadbe, restorane, hotele, korporativne proslave, rođendane) sa profesionalnim bendovima i muzičarima širom Srbije.

**Misija:** Učiniti proces pronalaženja i rezervisanja benda potpuno digitalnim — od pretrage i filtriranja, preko online rezervacije, do interakcije gostiju sa bendom uživo tokom nastupa.

---

## 2. KORISNIČKE GRUPE

### 2.1 Klijenti (Organizatori događaja)
- Mladenci koji traže bend za svadbu
- Vlasnici restorana i hotela koji žele stalnu živu muziku
- Organizatori korporativnih proslava
- Privatne proslave (rođendani, proslave, jubileji)

### 2.2 Bendovi i Muzičari
- Profesionalni bendovi svih žanrova
- Solo muzičari (vokalisti, instrumentalisti, DJ-evi)
- Zamene i gostujući muzičari

### 2.3 Administratori platforme
- Upravljanje korisnicima, bendovima, plaćanjima i sadržajem

---

## 3. KLJUČNE FUNKCIONALNOSTI

### 3.1 🏠 Početna stranica (Landing)
- **Hero sekcija** sa pretragom bendova po žanru i lokaciji
- **Istaknuti bendovi** — automatski kurirani premium profili
- **Vodič za klijente** — koraci: pretraži → izaberi → zakaži
- **Blog sekcija** — najnoviji članci sa savetima
- **Testimonijali** — ocene klijenata
- **Galerija** — vizuelni prikaz atmosfere sa nastupa
- **Footer** sa kontaktom, linkovima i socijalnim mrežama

### 3.2 🔍 Pretraga bendova (/clients)
- **Filtriranje po žanru:** Pop/Rock, Zabavna, Narodna, Jazz, Acoustic, DJ
- **Filtriranje po lokaciji** (gradovi širom Srbije)
- **Sortiranje** po oceni, imenu ili žanru
- **Paginacija** sa modernim karticama bendova
- Svaka kartica prikazuje: sliku/video, ime, žanr, lokaciju, ocenu i cenu
- **Responsive dizajn** — od mobilnog do desktopa

### 3.3 👤 Profil benda (/clients/band/[id])
- **Hero sekcija** sa slikom benda, imenom, žanrom, lokacijom
- **Verifikacioni bedž** (✓ Verifikovan bend)
- **Bio/opis** benda
- **Meta podaci:** Lokacija, žanr, raspon cena, kontakt
- **Audio snippet** — kratak zvučni uzorak
- **Video sekcija** — YouTube/Vimeo embed
- **Galerija fotografija** — optimizovane slike u grid prikazu
- **Cenovnik (Paketi)** — kartice sa nazivom, opisom i cenom
- **Javni repertoar** — lista pesama dostupna gostima
- **Kalendar zauzetosti** — vizuelni prikaz slobodnih datuma
- **Kontakt forma** — direktno slanje poruke bendu
- **Recenzije** — sistem ocenjivanja sa zvezdicama i komentarima
- **Social Share** — deljenje profila na društvenim mrežama
- **SEO optimizovano** — dinamički title, description, OG tagovi za Facebook/Twitter

### 3.4 🎛️ Dashboard za muzičare (/bands)
- **Statistike:** broj pesama, novih upita, prosečna ocena, pregledi profila
- **Grafikon aktivnosti** — vizuelni prikaz mesečnog rada
- **Upravljanje repertoarom** — dodavanje, brisanje, kategorisanje pesama
- **Kalendar zauzetosti** — označavanje zauzetih datuma sa napomenama
- **Pregled rezervacija** — status upita (novi, potvrđen, odbijen)
- **Kontakt poruke** — inbox poruka sa klijentima
- **Notifikacije** — real-time obaveštenja (zvonce sa brojem nepročitanih)
- **Referral sistem** — generisanje jedinstvenog koda za preporuku

### 3.5 ⚡ Live Request sistem (/bands/live + /live/[id])

> **Inovativna funkcija — jedinstven USP platforme**

- **Za goste (publiku):** Skeniraj QR kod u restoranu → izaberi pesmu iz repertoara → pošalji zahtev bendu
- **Za muzičare (dashboard):** Real-time lista zahteva → prihvati/odbij/odsviraj
- **Bakšiš sistem:** Gosti mogu dodati bakšiš uz zahtev za pesmu
- **Bakšiš preko konobara:** Konobar može poslati bakšiš u ime stola
- **Night Mode** dizajn — optimizovan za tamno okruženje nastupa
- **Auto-scroll teksta** pesme na ekranu muzičara
- **Transpozicija teksta** u realnom vremenu
- **Set liste** — kreiranje i organizovanje set listi za nastupe
- **Cheatsheet** — brzi pregled teksta pesme sa akordima
- **Session timer** — merenje trajanja nastupa
- **Ograničenje po planu:** Samo Premium korisnici imaju pristup

### 3.6 🎵 Repertoar i Pesmarica (/bands/repertoire + /bands/pesmarica)
- **Repertoar benda** — kompletna lista svih pesama sa kategorijama
- **Pesmarica** — centralna baza tekstova pesama na platformi
- **Pretraga pesama** po naslovu, izvođaču ili žanru
- **Predlog pesama** — korisnici mogu predložiti nove pesme za pesmaricu

### 3.7 🎹 MIDI Biblioteka (/bands/midi)
- **Upload i preuzimanje MIDI fajlova** za Korg PA i druge aranžere
- **Preview** MIDI fajlova u browseru
- **Korg PA Set liste** — organizovani setovi za preuzimanje

### 3.8 🤝 Platforma za muzičare (/muzicari)
- **Pretraga muzičara** po instrumentu, gradu, budžetu i iskustvu
- **Profil muzičara** — instrument, grad, bio, iskustvo, galerija
- **Sistem pozivnica** — bendovi šalju pozive muzičarima za saradnju
- **Chat komunikacija** — razmena poruka između bendova i muzičara
- **Bidirekcione pozivnice** — muzičar može i sam da se prijavi za poziciju

### 3.9 📝 Blog (/blog)
- **Članci** sa savetima za organizaciju proslava
- **Cover slike** i formatiran sadržaj
- **SEO optimizovano** — svaki post ima meta tagove

### 3.10 ❓ FAQ (/faq)
- **14 najčešćih pitanja** sa odgovorima
- Pokriva: pretragu, rezervaciju, Live Request, cene, plaćanje, registraciju

### 3.11 💳 Pretplate i plaćanje (/upgrade + /premium)
- **Basic plan (besplatan):** Pretraga bendova, slanje upita, profil benda
- **Premium plan (49€/mesečno):** MIDI biblioteka, chat, više poziva, Live Request
- **Premium Venue (79€/mesečno):** Sve iz Premium + Korg PA setovi, video/audio upload
- **IPS QR kod plaćanje** — NBS standard, skeniranje u mBanking aplikaciji
- **Stripe integracija** — alternativno plaćanje karticom
- **Automatski PDF računi** nakon uplate
- **Email podsetnici** 3 dana pre isteka pretplate

### 3.12 🔐 Admin panel (/admin)
- **Dashboard** sa statistikama: korisnici, bendovi, rezervacije, pesme, recenzije
- **Upravljanje korisnicima** — pregled, izmena uloga
- **Upravljanje bendovima** — verifikacija, isPaid status, brisanje
- **Upravljanje rezervacijama** — pregled svih upita
- **Upravljanje recenzijama** — moderacija
- **Pesmarica admin** — odobravanje predloženih pesama
- **Plaćanja** — pregled billing event-ova
- **Sistem podešavanja** — globalne konfiguracije sajta (maintenance mode, demo bendovi)

---

## 4. TEHNIČKI STACK

| Komponenta | Tehnologija |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, Lucide Icons |
| **Styling** | CSS Modules, JSX Style, TailwindCSS (selektivno) |
| **Animacije** | Framer Motion |
| **Backend** | Next.js API Routes (serverless) |
| **Baza podataka** | PostgreSQL (Supabase/Neon) |
| **ORM** | Prisma 5 sa migracijama |
| **Autentifikacija** | NextAuth.js + JWT (custom dual auth) |
| **Google OAuth** | Prijava preko Google naloga |
| **Plaćanje** | Stripe (kartice) + IPS QR (srpske banke) |
| **Upload slika** | Cloudinary (CDN, WebP/AVIF konverzija) |
| **Email** | Nodemailer (SMTP) |
| **Real-time** | Polling-based Live Request sistem |
| **SEO** | Dynamic metadata, JSON-LD schema, sitemap.xml, robots.txt |
| **PWA** | manifest.json, Service Worker, Add to Home Screen |
| **Hosting** | Netlify (Edge, auto-deploy sa GitHub) |
| **CI/CD** | GitHub Actions (lint, audit, build) |
| **Monitoring** | Netlify Analytics |

---

## 5. DIZAJN I UX

### Vizuelni identitet
- **Tema:** Tamna (dark mode) — elegantna, moderna, profesionalna
- **Primarne boje:** Ljubičasta (#8b5cf6), plava (#007aff), tamna pozadina (#0a0a0c)
- **Fontovi:** Inter (body), Montserrat (headings), Playfair Display (akcentni)
- **Ikonice:** Lucide React — konzistentne outline ikonice

### Responsive dizajn
- **Mobile-first** pristup
- **iPhone:** Optimizovano za notch (safe-area-inset), bottom sheet za notifikacije
- **Tablet:** Prilagođen grid za kartice i dashboard
- **Desktop:** Pun layout sa sidebararom
- **Breakpoints:** 480px, 520px, 640px, 768px, 968px, 1200px
- **Viewport:** Pinch-zoom dozvoljen (pristupačnost)

### UX elementi
- **Skeleton loading** — animirani placeholder dok se sadržaj učitava
- **Toast notifikacije** — real-time obaveštenja
- **Modal dijalozi** — potvrde, napomene, kalendar
- **Chip filteri** — vizuelni žanr tagovi
- **Star rating** — interaktivno ocenjivanje
- **Social share** — Facebook, Twitter, WhatsApp, copy link

---

## 6. BEZBEDNOST

- **JWT autentifikacija** sa httpOnly kolačićima
- **NextAuth** za OAuth (Google)
- **RBAC** (Role-Based Access Control): ADMIN, BAND, CLIENT, MUSICIAN
- **Rate limiting** na kontakt formi i API rutama
- **CSRF zaštita** preko NextAuth
- **Stripe webhook verifikacija** sa potpisom
- **Server-side validacija** svih inputa
- **Env varijable** — tajne nikad eksponirane klijentu

---

## 7. MONETIZACIJA

| Plan | Cena | Funkcionalnosti |
|---|---|---|
| **Basic** | Besplatno | Profil benda, pretraga, rezervacije, repertoar |
| **Premium** | 49€/mesečno | Live Request, MIDI, chat, prioritet u pretrazi |
| **Premium Venue** | 79€/mesečno | Sve iz Premium + Korg PA, video/audio upload |

Plaćanje: IPS QR kod (srpske banke) ili Stripe (međunarodne kartice).

---

## 8. METRIKE I SEO

- **Structured Data:** Organization, Service, WebSite, BandProfile, MusicianProfile JSON-LD schemas
- **Dynamic OG tags:** Svaka stranica benda generiše unikatne OpenGraph i Twitter kartice
- **Sitemap:** Automatski generisan sa svim bendovima, muzičarima i blog postovima
- **Robots.txt:** Optimizovan za Googlebot — dozvoljava javne stranice, blokira admin/API
- **Canonical URLs:** Na svim stranicama
- **Google Search Console:** Integrisana verifikacija

---

## 9. KLJUČNE STRANICE (MAPA SAJTA)

```
/                           → Početna (landing page)
/clients                    → Pretraga bendova (javna)
/clients/band/[id]          → Profil benda (javna)
/muzicari                   → Pretraga muzičara
/muzicari/[id]              → Profil muzičara
/muzicari/profil            → Uređivanje profila muzičara
/bands                      → Dashboard za muzičare/bendove (zaštićeno)
/bands/profile              → Uređivanje profila benda
/bands/repertoire           → Upravljanje repertoarom
/bands/pesmarica            → Pesmarica
/bands/midi                 → MIDI biblioteka
/bands/live                 → Live Request dashboard (Premium)
/bands/song/[id]            → Cheatsheet — tekst pesme
/live/[id]                  → Live Request za goste (javna, QR)
/blog                       → Blog sa člancima
/blog/[slug]                → Pojedinačni blog post
/about                      → O nama
/faq                        → Često postavljana pitanja
/login                      → Prijava/Registracija
/upgrade                    → Nadogradnja plana
/premium/checkout            → Stripe checkout
/premium/success            → Uspešna uplata
/premium/cancel             → Otkazana uplata
/privatnost                 → Politika privatnosti
/uslovi-koriscenja          → Uslovi korišćenja
/admin                      → Admin dashboard
/admin/bands                → Upravljanje bendovima
/admin/users                → Upravljanje korisnicima
/admin/bookings             → Upravljanje rezervacijama
/admin/reviews              → Moderacija recenzija
/admin/payments             → Pregled plaćanja
/admin/pesmarica            → Upravljanje pesmaricon
/admin/system               → Sistemska podešavanja
```

---

## 10. KONTAKT I FIRMA

- **Sajt:** [pronadjibend.rs](https://pronadjibend.rs)
- **Email:** office@pronadjibend.rs
- **Telefon:** +381 64 339 2339
- **Lokacija:** Sokobanja, Srbija
- **GitHub:** github.com/promotivsokobanja/pronadjibend

---

## 11. SAŽETAK ZA PREZENTACIJU

> **Pronađi Bend** je prva srpska all-in-one platforma za živu muziku koja digitalizuje celokupan proces — od pronalaženja benda, preko online rezervacije, do interakcije publike sa muzičarima tokom nastupa putem revolucionarnog **Live Request** sistema.
>
> Platforma povezuje **klijente** (mladence, restoritere, organizatore) sa **profesionalnim bendovima i muzičarima** širom Srbije, nudeći transparentne profile sa recenzijama, cenovnike, digitalni repertoar i moderan booking sistem.
>
> Sa **3 plana pretplate**, IPS QR plaćanjem prilagođenim srpskom tržištu i **Stripe integracijom** za međunarodne klijente, Pronađi Bend predstavlja skalabilnu SaaS platformu spremnu za rast.

---

*Dokument generisan: maj 2026. | Verzija: 1.0*
*Za AI generisanje prezentacije: koristite ovaj dokument kao bazu za slide-ove, wireframe-ove ili video prezentaciju.*
