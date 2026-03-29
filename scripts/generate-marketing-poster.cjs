/**
 * Generiše javni A4 poster (2480×3508) sa QR ka registraciji bendova.
 * Iz korena: node scripts/generate-marketing-poster.cjs
 */
const path = require('path');
const fs = require('fs').promises;

async function main() {
  const { renderMarketingPosterPng } = await import('../lib/marketingPoster.js');
  const { getSiteUrl } = await import('../lib/siteUrl.js');

  const qrUrl = `${getSiteUrl()}/bands/profile`;
  const buffer = await renderMarketingPosterPng({ qrUrl, bandDisplayName: null });

  const OUT = path.join(__dirname, '..', 'public', 'marketing', 'poster-A4.png');
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, buffer);
  console.log('Wrote', OUT, '2480 x 3508 (A4 @ 300 DPI), QR:', qrUrl);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
