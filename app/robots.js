import { getSiteUrl } from '@/lib/siteUrl';

export default function robots() {
  const site = getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/', '/bands/live', '/bands/repertoire', '/bands/profile'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
