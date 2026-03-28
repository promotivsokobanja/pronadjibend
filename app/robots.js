export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: 'https://pronadjibend.rs/sitemap.xml',
    host: 'https://pronadjibend.rs',
  };
}
