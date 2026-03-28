import '../styles/globals.css';
import { Inter, Montserrat } from 'next/font/google';
import StrictModeProvider from '@/components/providers/StrictModeProvider';
import { getSiteUrl } from '@/lib/siteUrl';

const siteUrl = getSiteUrl();
const siteOrigin = new URL(siteUrl);

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
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
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

export default function RootLayout({ children }) {
  return (
    <html lang="sr" className={`${inter.variable} ${montserrat.variable}`}>
      <body
        style={{
          minHeight: '100vh',
          margin: 0,
          backgroundColor: '#f8fafc',
          color: '#0f172a',
        }}
      >
        <StrictModeProvider>{children}</StrictModeProvider>
        <div id="notifications" />
      </body>
    </html>
  );
}
