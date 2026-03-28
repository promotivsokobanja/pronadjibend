export const DEMO_COVER_BY_NAME = {
  'electric vibes': '/images/bands/electric-vibes.png',
  'soul harmony': '/images/bands/soul-harmony.png',
  'kafanski biseri': '/images/bands/kafanski-biseri.png',
  'midnight acoustic': '/images/bands/midnight-acoustic.png',
  'urban funk': '/images/bands/urban-funk.png',
  'acoustic dreams': '/images/bands/acoustic-dreams.png',
};

export const DEFAULT_BAND_COVER = '/images/bands/electric-vibes.png';

export function resolveBandCoverImage(band) {
  const name = (band?.name || '').toLowerCase().trim();
  if (name && DEMO_COVER_BY_NAME[name]) return DEMO_COVER_BY_NAME[name];
  const img = band?.img && String(band.img).trim();
  if (img) return img;
  return DEFAULT_BAND_COVER;
}
