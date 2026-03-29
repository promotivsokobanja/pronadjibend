const FALLBACK_SITE = 'https://pronadjibend.rs';

/**
 * Kanonski URL sajta (SEO, sitemap, OG). Netlify postavlja URL na build;
 * za eksplicitnu kontrolu koristi NEXT_PUBLIC_SITE_URL.
 */
export function getSiteUrl() {
  const raw =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) ||
    (typeof process !== 'undefined' && process.env.URL) ||
    FALLBACK_SITE;
  return String(raw).replace(/\/$/, '');
}

/**
 * Za `metadataBase` u root layout — ne baca ako je env relativan ili nevalidan.
 */
export function getSiteMetadataBaseUrl() {
  const siteUrl = getSiteUrl();
  try {
    const u = new URL(siteUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return new URL(FALLBACK_SITE);
    }
    return u;
  } catch {
    return new URL(FALLBACK_SITE);
  }
}
