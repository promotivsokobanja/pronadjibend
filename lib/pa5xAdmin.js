import crypto from 'crypto';

/**
 * Alat „Pa5X Ključevi“ (samo kod vlasnika) šalje tajnu u zaglavlju X-Pa5x-Admin. Ovde je samo njen SHA-256 –
 * sama tajna je kod vlasnika (SAJT\Kljucevi programa\admin_token_sajt.txt), ne na sajtu i ne u ovom kodu.
 */
const ADMIN_HASH = '21785a6c59d5900168161fd2456aef0f0c3c9cd3c8c5c9e914705db54947ac71';

export function isPa5xAdmin(request) {
  const t = String(request.headers.get('x-pa5x-admin') || '').trim();
  if (t.length < 20) return false;
  const h = crypto.createHash('sha256').update(t).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(ADMIN_HASH));
}
