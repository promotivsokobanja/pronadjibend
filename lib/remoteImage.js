/**
 * next/image optimizacija samo za dozvoljene hostove (remotePatterns).
 * Ostale remote URL-e učitavamo bez proxy-ja da build/runtime ne puknu.
 */
export function nextImageShouldUnoptimize(src) {
  if (!src || typeof src !== 'string') return true;
  if (src.startsWith('/')) return false;
  if (!/^https?:\/\//i.test(src)) return true;
  try {
    const { hostname } = new URL(src);
    const h = hostname.toLowerCase();
    if (h === 'images.unsplash.com') return false;
    if (h === 'res.cloudinary.com') return false;
    return true;
  } catch {
    return true;
  }
}
