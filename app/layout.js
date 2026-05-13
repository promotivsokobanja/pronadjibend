import '../styles/globals.css';
import { Inter, Montserrat, Playfair_Display } from 'next/font/google';
import StrictModeProvider from '@/components/providers/StrictModeProvider';
import { getSiteUrl, getSiteMetadataBaseUrl } from '@/lib/siteUrl';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

const siteUrl = getSiteUrl();
const siteOrigin = getSiteMetadataBaseUrl();

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});


const googleVerify = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata = {
  metadataBase: siteOrigin,
  title: {
    default: 'Pronađi Bend – Najbolja Živa Muzika za Svadbe, Hotele i Proslave | Srbija',
    template: '%s | Pronađi Bend',
  },
  description:
    'Pronađite i rezervišite bend za svadbu, restoran ili korporativni event. Uživo muzika Srbija — iznajmljivanje bendova, DJ-eva i muzičara za sve vrste proslava. Brza rezervacija, provereni izvođači.',
  applicationName: 'Pronađi Bend',
  keywords: [
    'bend za svadbu',
    'muzika za svadbe',
    'muzika za restorane',
    'iznajmljivanje bendova',
    'uživo muzika Srbija',
    'bend za proslavu',
    'muzičari za hotele',
    'live muzika Beograd',
    'rezervacija benda',
    'bend za korporativni event',
    'pronadjibend',
    'muzika za venčanje',
    'bend za rođendan',
    'DJ za svadbu Srbija',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'sr_RS',
    url: siteUrl,
    siteName: 'Pronađi Bend',
    title: 'Pronađi Bend – Najbolja Živa Muzika za Svadbe, Hotele i Proslave',
    description:
      'Iznajmite proverene bendove i muzičare za svadbe, restorane, hotele i proslave širom Srbije. Brza online rezervacija, digitalni repertoar i Live Request sistem.',
    images: [
      {
        url: '/images/og-cover.png',
        width: 1200,
        height: 630,
        alt: 'Pronađi Bend — Platforma za iznajmljivanje bendova u Srbiji',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pronađi Bend – Najbolja Živa Muzika za Svadbe i Proslave',
    description:
      'Iznajmite proverene bendove za svadbe, hotele i proslave. Online rezervacija, 600+ pesama, Live Request sistem.',
    images: ['/images/og-cover.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Pronađi Bend',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/favicon.ico',
    apple: [
      { url: '/images/logo.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  ...(googleVerify
    ? {
        verification: { google: googleVerify },
        other: { 'google-site-verification': googleVerify },
      }
    : {}),
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  /* Dozvoli pinch-zoom na mobilnom (pristupačnost); ranije maximumScale:1 je blokirao uvećanje */
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#0a0a0c',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Pronađi Bend',
      url: siteUrl,
      logo: `${siteUrl}/images/logo.png`,
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'office@pronadjibend.com',
        telephone: '+381643392339',
        contactType: 'customer service',
        areaServed: 'RS',
        availableLanguage: 'Serbian',
      },
      sameAs: [
        'https://www.instagram.com/pronadjibend',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'Pronađi Bend',
      description: 'Platforma za pronalaženje i rezervaciju bendova i muzičara za svadbe, hotele i proslave u Srbiji.',
      publisher: { '@id': `${siteUrl}/#organization` },
      inLanguage: 'sr',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/clients?search={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="sr"
      className={`theme-dark ${inter.variable} ${montserrat.variable} ${playfair.variable}`}
    >
      <body style={{ margin: 0 }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <StrictModeProvider>{children}</StrictModeProvider>
        <ServiceWorkerRegister />
        <div id="notifications" />
      </body>
    </html>
  );
}
