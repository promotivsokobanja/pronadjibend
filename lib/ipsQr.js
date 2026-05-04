/**
 * NBS IPS QR Generator
 * Generiše string za QR kod po standardu Narodne Banke Srbije (IPS standard).
 *
 * Format: K:PR|V:01|C:1|R:{račun18}|N:{primalac}|I:RSD|P:{iznos}|SF:{šifra}|S:{svrha}|RO:{pozivNaBroj}
 *
 * Firma: ProMotiv
 * PIB:   108191504
 * MB:    63280801
 * Račun: 325-9500700031761-69 (OTP Bank)
 */

// ── Podaci firme ──────────────────────────────────────────────
const FIRM = {
  name: 'ProMotiv',
  pib: '108191504',
  mb: '63280801',
  accountFormatted: '325-9500700031761-69',
  // 18-cifarski format za IPS: 325 + 9500700031761 + 69
  account18: '325950070003176169',
};

// Šifra plaćanja — 289 = plaćanje usluga
const SIFRA_PLACANJA = '289';

// ── Plan cene (defaults, admin može da menja u SiteConfig) ───
const DEFAULT_PRICES = {
  PREMIUM: 49,
  PREMIUM_VENUE: 79,
};

const DEFAULT_EUR_TO_RSD = 117.5;

// ── Javne funkcije ───────────────────────────────────────────

/**
 * Generiše IPS QR payload string po NBS standardu.
 *
 * @param {Object}  params
 * @param {string}  params.referenceId  - Jedinstven poziv na broj (10 cifara)
 * @param {string}  params.plan         - "PREMIUM" ili "PREMIUM_VENUE"
 * @param {number}  params.amountRsd    - Iznos u RSD (zaokružen na 2 decimale)
 * @returns {string} IPS QR payload string (pipe-delimited)
 */
export function generateIpsQrString({ referenceId, plan, amountRsd }) {
  if (!referenceId || !plan || !amountRsd) {
    throw new Error('IPS QR: referenceId, plan i amountRsd su obavezni.');
  }

  // Iznos: decimalni zarez, dve decimale, bez separatora hiljada
  const formattedAmount = Number(amountRsd).toFixed(2).replace('.', ',');

  const planLabel = plan === 'PREMIUM_VENUE' ? 'Premium Venue' : 'Premium';
  // Svrha plaćanja — max 35 karaktera po NBS standardu
  const purpose = `PronadjiBend ${planLabel}`.slice(0, 35);

  // Poziv na broj primaoca — model 00 (bez kontrolnog broja)
  const reference = `00${referenceId}`;

  const fields = [
    'K:PR',                       // Payment Request
    'V:01',                       // Verzija 01
    'C:1',                        // UTF-8
    `R:${FIRM.account18}`,        // Račun primaoca (18 cifara)
    `N:${FIRM.name}`,             // Ime primaoca
    'I:RSD',                      // Valuta
    `P:${formattedAmount}`,       // Iznos
    `SF:${SIFRA_PLACANJA}`,       // Šifra plaćanja
    `S:${purpose}`,               // Svrha plaćanja
    `RO:${reference}`,            // Poziv na broj primaoca
  ];

  return fields.join('|');
}

/**
 * Generiše jedinstven 10-cifreni numerički referenceId.
 * Format: GGMM + 6 random cifara
 *
 * @returns {string} 10-cifreni string (npr. "2605483921")
 */
export function generateReferenceId() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  return `${yy}${mm}${rand}`;
}

/**
 * Računa iznos u RSD na osnovu plana i kursa.
 *
 * @param {string} plan         - "PREMIUM" ili "PREMIUM_VENUE"
 * @param {number} [eurToRsdRate] - Kurs EUR → RSD (default 117.5)
 * @param {Object} [prices]     - Opcione custom cene { PREMIUM, PREMIUM_VENUE }
 * @returns {{ amountEur: number, amountRsd: number }}
 */
export function calculateAmount(plan, eurToRsdRate, prices) {
  const rate = Number(eurToRsdRate) || DEFAULT_EUR_TO_RSD;
  const priceMap = { ...DEFAULT_PRICES, ...prices };
  const amountEur = priceMap[plan] ?? priceMap.PREMIUM;
  // Zaokruživanje na 2 decimale da sprečimo floating-point greške u QR kodu
  const amountRsd = Math.round(amountEur * rate * 100) / 100;
  return { amountEur, amountRsd };
}

/**
 * Vraća podatke firme (za PDF račune i prikaz).
 * @returns {Object}
 */
export function getFirmData() {
  return { ...FIRM };
}
