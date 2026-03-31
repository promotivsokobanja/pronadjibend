import '../styles/globals.css';
import { Inter } from 'next/font/google';
import SiteShell from './_components/SiteShell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-main',
  display: 'swap',
});

export const metadata = {
  title: {
    default: 'Pronađi Bend',
    template: '%s | Pronađi Bend',
  },
  description:
    'Platforma za live naručivanje pesama, upravljanje bendom i pronalazak muzičara.',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="sr" className={inter.variable}>
      <body className="min-h-dvh bg-slate-50 text-slate-900 antialiased">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
