/**
 * Kanonski URL sajta (SEO, sitemap, OG). Netlify postavlja URL na build;
 * za eksplicitnu kontrolu koristi NEXT_PUBLIC_SITE_URL.
 */
export function getSiteUrl() {
  const raw =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) ||
    (typeof process !== 'undefined' && process.env.URL) ||
    'https://pronadjibend.rs';
  return String(raw).replace(/\/$/, '');
}
