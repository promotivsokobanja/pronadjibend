import { Suspense } from 'react';
import ClientSearchClient from './ClientSearchClient';
import BandCardSkeleton from '@/components/BandCardSkeleton';
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
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white page-below-fixed-nav">
          <main className="container pb-10 pt-6 md:pb-14 md:pt-10">
            <div className="mb-8 h-10 max-w-md animate-pulse rounded-lg bg-slate-100 md:mb-10" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 lg:gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <BandCardSkeleton key={i} />
              ))}
            </div>
          </main>
        </div>
      }
    >
      <ClientSearchClient />
    </Suspense>
  );
}
