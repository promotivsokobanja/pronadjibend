import '../styles/globals.css';
import { Inter, Montserrat } from 'next/font/google';
import StrictModeProvider from '@/components/providers/StrictModeProvider';

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

export const metadata = {
  metadataBase: new URL('https://pronadjibend.rs'),
  title: {
    default: 'Pronađi Bend | Digitalna Platforma za Muzičke Nastupe',
    template: '%s | Pronađi Bend',
  },
  description:
    'Pronađite savršen bend za vaš nastup, naručite pesmu u realnom vremenu i pratite digitalne repertoare.',
  applicationName: 'Pronađi Bend',
  keywords: [
    'bendovi',
    'muzika za svadbe',
    'muzičari',
    'live muzika',
    'rezervacija benda',
    'pronadjibend',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'sr_RS',
    url: 'https://pronadjibend.rs',
    siteName: 'Pronađi Bend',
    title: 'Pronađi Bend | Digitalna Platforma za Muzičke Nastupe',
    description:
      'Pronađite savršen bend za vaš nastup, naručite pesmu u realnom vremenu i pratite digitalne repertoare.',
    images: [
      {
        url: '/images/logo.png',
        width: 1200,
        height: 630,
        alt: 'Pronađi Bend',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pronađi Bend | Digitalna Platforma za Muzičke Nastupe',
    description:
      'Pronađite savršen bend za vaš nastup, naručite pesmu u realnom vremenu i pratite digitalne repertoare.',
    images: ['/images/logo.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
