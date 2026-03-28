import { Suspense } from 'react';
import ClientSearchClient from './ClientSearchClient';

export const metadata = {
  title: 'Pretraži Bendove za Svadbe, Hotele i Proslave',
  description:
    'Pretražite i filtrirajte bendove i muzičare po žanru, lokaciji i oceni. Bend za svadbu, muzika za restorane, iznajmljivanje bendova — uživo muzika Srbija. Brza online rezervacija.',
  alternates: { canonical: '/clients' },
  openGraph: {
    title: 'Pretraži Bendove — Pronađi Bend',
    description: 'Kuriran izbor proverenih bendova za svadbe, hotele, restorane i proslave širom Srbije.',
    url: 'https://pronadjibend.rs/clients',
    images: [{ url: '/images/og-cover.png', width: 1200, height: 630, alt: 'Pretraga bendova na Pronađi Bend platformi' }],
  },
};

export default function ClientSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white pt-24">
          <div className="container flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#007AFF]" />
          </div>
        </div>
      }
    >
      <ClientSearchClient />
    </Suspense>
  );
}
