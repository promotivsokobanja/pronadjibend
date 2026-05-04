# PronadjiBend — SaaS Billing Sistem

## Brzi pregled arhitekture

```
Korisnik → /upgrade → bira plan → POST /api/billing/generate-qr → QR kod (IPS NBS)
                                                                     ↓
                                              Korisnik skenira QR u mobilnom bankarstvu
                                                                     ↓
                                              Admin vidi uplatu u /admin/payments
                                                                     ↓
                                        Admin klikne "Potvrdi uplatu" → POST /api/admin/payments
                                                                     ↓
                                   ┌─────────────────────────────────────────────────┐
                                   │  ATOMARNA TRANSAKCIJA ($transaction):           │
                                   │  1. User.plan → PREMIUM / PREMIUM_VENUE        │
                                   │  2. User.planUntil → +30 dana                 │
                                   │  3. Payment.status → CONFIRMED                 │
                                   │  4. Band.plan sync                             │
                                   └─────────────────────────────────────────────────┘
                                                                     ↓
                                   POST-TRANSAKCIJA (ne blokira potvrdu):
                                   5. Generiše PDF račun (jsPDF)
                                   6. Šalje PDF na email korisnika (Nodemailer)
                                   7. Payment.status → INVOICE_SENT
```

---

## ENV varijable (dodati u Netlify / .env.local)

```env
# ── SMTP za slanje emailova ──
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tvoj-email@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx        # Google App Password (ne obična lozinka!)
EMAIL_FROM=PronadjiBend <noreply@pronadjibend.rs>

# ── Cron zaštita ──
CRON_SECRET=generisi-random-string-ovde
```

### Kako napraviti Google App Password:
1. Idi na https://myaccount.google.com/apppasswords
2. Izaberi "Mail" i "Windows Computer"
3. Kopiraj 16-karakterni password
4. Stavi ga u `SMTP_PASS`

### Alternativa: Resend
Ako koristiš Resend umesto Gmail-a:
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxx
EMAIL_FROM=PronadjiBend <noreply@pronadjibend.rs>
```

---

## Fajlovi i njihova uloga

| Fajl | Opis |
|------|------|
| `prisma/schema.prisma` | Payment model, User.lastPaymentId, SiteConfig pricing polja |
| `lib/ipsQr.js` | NBS IPS QR string generator (račun ProMotiv, OTP Banka) |
| `lib/invoice.js` | PDF račun generator (jsPDF) — firma, kupac, tabela, ukupno |
| `lib/email.js` | Nodemailer — slanje računa, podsetnika, nudge emailova |
| `lib/siteConfig.js` | getPricingConfig / setPricingConfig za kurs i cene |
| `app/api/billing/generate-qr/route.js` | POST — kreira Payment + vraća QR sliku |
| `app/api/billing/pricing/route.js` | GET — javne cene za /upgrade stranicu |
| `app/api/admin/payments/route.js` | GET lista + POST potvrda uplate (atomarna) |
| `app/api/cron/daily/route.js` | Dnevni cron: podsetnici, downgrade, nudge |
| `app/(public)/upgrade/page.js` | Korisnikova stranica za izbor plana i QR |
| `app/admin/payments/page.js` | Admin tabela uplata sa "Potvrdi uplatu" |
| `app/admin/system/page.js` | Sekcija "Cene pretplata i kurs" |

---

## Kako radi korak po korak

### 1. Korisnik želi Premium
- Odlazi na `/upgrade`
- Vidi dva plana sa cenama (učitane iz SiteConfig)
- Opciono unosi podatke firme (PIB, MB)
- Klikne "Generiši QR za uplatu"

### 2. QR generisanje
- API kreira `Payment` zapis (status: `PENDING_QR`)
- Generiše 10-cifreni poziv na broj (GGMM + 6 random)
- Gradi IPS QR string po NBS standardu
- Vraća QR sliku (base64 PNG)
- Korisnik skenira u mobilnom bankarstvu

### 3. Admin potvrđuje
- Odlazi na `/admin/payments`
- Vidi listu korisnika koji su generisali QR
- Proverava na bankovnom izvodu da je uplata stigla
- Klikne "Potvrdi uplatu" → atomarna transakcija

### 4. Šta se dešava pri potvrdi
1. `User.plan` → PREMIUM ili PREMIUM_VENUE
2. `User.planUntil` → danas + 30 dana
3. `Payment.status` → CONFIRMED
4. `Band.plan` sync + `isPaid = true`
5. PDF račun se generiše
6. Email sa PDF-om se šalje korisniku
7. `Payment.status` → INVOICE_SENT

Ako email ne uspe — korisnik JE nadograđen, ali admin dobija poruku da račun pošalje ručno.

### 5. Dnevni cron
Poziva se `GET /api/cron/daily` sa headerom `Authorization: Bearer {CRON_SECRET}`:
- **3 dana pre isteka** → email podsetnik sa QR za obnovu
- **Istekao planUntil** → automatski downgrade na BASIC
- **Free korisnici** sa < 50% profila → nudge email

---

## Kako podesiti cron na Netlify

Dodaj u `netlify.toml`:
```toml
[functions."cron-daily"]
  schedule = "0 6 * * *"   # svaki dan u 06:00 UTC
```

Ili koristi GitHub Actions / cURL cron servis:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://pronadjibend.rs/api/cron/daily
```

---

## Podaci firme (hardkodirani u lib/ipsQr.js)

| Polje | Vrednost |
|-------|----------|
| Firma | ProMotiv |
| PIB | 108 191 504 |
| MB | 63 280 801 |
| Banka | OTP Bank |
| Račun | 325-9500700031761-69 |
| IPS format (18 cifara) | 325950070003176169 |

---

## Cene (menjaju se iz Admin > Sistem)

| Plan | Default EUR | Default RSD (kurs 117.5) |
|------|-------------|--------------------------|
| Premium | 49 EUR | 5.757,50 RSD |
| Premium Venue | 79 EUR | 9.282,50 RSD |

Admin može da promeni kurs i cene iz `/admin/system` → sekcija "Cene pretplata i kurs".

---

## Checklist za aktivaciju

- [ ] Dodaj SMTP env varijable (Gmail App Password ili Resend)
- [ ] Dodaj CRON_SECRET env varijablu
- [ ] Pokreni `npx prisma db push` na produkcijskoj bazi
- [ ] Podesi cron job (Netlify / GitHub Actions / cURL)
- [ ] Testiraj: napravi test uplatu, potvrdi iz admina, proveri email
- [ ] Opciono: dodaj link ka /upgrade u navigaciju sajta
