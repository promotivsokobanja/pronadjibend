import HomeClient from './HomeClient';
import { OrganizationSchema, ServiceSchema, WebSiteSchema } from '@/components/JsonLd';

export const metadata = {
  title: 'Pronađi Bend – Najbolja Živa Muzika za Svadbe, Hotele i Proslave',
  description:
    'Pronađite i rezervišite bend za svadbu, restoran ili hotel. Iznajmljivanje bendova i muzičara za sve vrste proslava — uživo muzika Srbija. Brza online rezervacija, digitalni repertoar, Live Request.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Pronađi Bend – Najbolja Živa Muzika za Svadbe, Hotele i Proslave',
    description:
      'Iznajmite proverene bendove i muzičare za svadbe, restorane, hotele i proslave širom Srbije. 600+ pesama, Live Request sistem.',
    url: 'https://pronadjibend.rs',
    images: [{ url: '/images/og-cover.png', width: 1200, height: 630, alt: 'Pronađi Bend — platforma za iznajmljivanje bendova' }],
  },
};

export default function HomePage() {
  return (
    <>
      <OrganizationSchema />
      <ServiceSchema />
      <WebSiteSchema />
      <HomeClient />
    </>
  );
}
