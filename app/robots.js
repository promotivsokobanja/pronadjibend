export default function robots() {
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
    sitemap: 'https://pronadjibend.rs/sitemap.xml',
    host: 'https://pronadjibend.rs',
  };
}
