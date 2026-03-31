import { Suspense } from 'react';
import MusiciansSearchClient from './MusiciansSearchClient';
import { getSiteUrl } from '@/lib/siteUrl';

const siteUrl = getSiteUrl();

export const metadata = {
  title: 'Pretraga Muzičara — Pronađi Bend',
  description:
    'Pronađite slobodne muzičare po instrumentu, gradu, budžetu i iskustvu. Platforma za bendove kojima su potrebni pouzdani članovi i zamene.',
  alternates: { canonical: '/muzicari' },
  openGraph: {
    title: 'Pretraga Muzičara — Pronađi Bend',
    description: 'Bubnjar, gitarista, vokal, klavijaturista i drugi muzičari na jednom mestu.',
    url: `${siteUrl}/muzicari`,
    images: [{ url: '/images/og-cover.png', width: 1200, height: 630, alt: 'Pretraga muzičara na Pronađi Bend platformi' }],
  },
};

export default function MusiciansPage() {
  return (
    <Suspense fallback={null}>
      <MusiciansSearchClient />
    </Suspense>
  );
}
