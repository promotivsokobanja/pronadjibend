import { getSiteUrl } from '@/lib/siteUrl';

const site = getSiteUrl();

export const metadata = {
  title: 'Blog & Saveti — Pronađi Bend',
  description:
    'Korisni saveti za organizaciju svadbi, izbor benda i muzike za proslave. Pročitajte najnovije članke na PronadjiBend.rs.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog & Saveti — Pronađi Bend',
    description:
      'Saveti za organizaciju proslava, izbor benda i muzike. PronadjiBend.rs blog.',
    url: `${site}/blog`,
    images: [{ url: '/images/og-cover.png', width: 1200, height: 630, alt: 'Pronađi Bend Blog' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog & Saveti — Pronađi Bend',
    description: 'Saveti za organizaciju proslava i izbor benda.',
  },
};

export default function BlogLayout({ children }) {
  return children;
}
