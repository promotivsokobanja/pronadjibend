import ClientSearchClient from './ClientSearchClient';
import { getSiteUrl } from '@/lib/siteUrl';

const siteUrl = getSiteUrl();

export const metadata = {
  title: 'Pretraži Bendove za Svadbe, Hotele i Proslave',
  description:
    'Pretražite i filtrirajte bendove i muzičare po žanru, lokaciji i oceni. Bend za svadbu, muzika za restorane, iznajmljivanje bendova — uživo muzika Srbija. Brza online rezervacija.',
  alternates: { canonical: '/clients' },
  openGraph: {
    title: 'Pretraži Bendove — Pronađi Bend',
    description: 'Kuriran izbor proverenih bendova za svadbe, hotele, restorane i proslave širom Srbije.',
    url: `${siteUrl}/clients`,
    images: [{ url: '/images/og-cover.png', width: 1200, height: 630, alt: 'Pretraga bendova na Pronađi Bend platformi' }],
  },
};

export default function ClientSearchPage() {
  return <ClientSearchClient />;
}
