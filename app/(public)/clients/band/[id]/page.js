import BandProfileClient from './BandProfileClient';
import { BandSchema } from '@/components/JsonLd';
import { getDemoBands } from '@/lib/demoBands';
import { getSiteUrl } from '@/lib/siteUrl';

function findDemoBand(id) {
  try {
    const demos = getDemoBands();
    return demos.find((b) => b.id === id) || null;
  } catch {
    return null;
  }
}

async function fetchBandFromAPI(id) {
  try {
    const baseUrl =
      process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || getSiteUrl();
    const res = await fetch(`${baseUrl}/api/bands/show/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const id = params.id;
  const isDemo = typeof id === 'string' && id.startsWith('demo-');

  let band = isDemo ? findDemoBand(id) : await fetchBandFromAPI(id);
  if (!band && !isDemo) band = findDemoBand(id);

  if (!band) {
    return {
      title: 'Profil Benda',
      description: 'Pogledajte profil benda na Pronađi Bend platformi.',
    };
  }

  const site = getSiteUrl();
  const title = `${band.name} — ${band.genre} Bend za Svadbe i Proslave | ${band.location}`;
  const description = band.bio
    || `${band.name} je ${band.genre} bend iz grada ${band.location}. Rezervišite nastup za svadbu, proslavu ili korporativni event. Ocena: ${band.rating}/5.`;

  return {
    title,
    description,
    alternates: { canonical: `/clients/band/${id}` },
    openGraph: {
      title: `${band.name} — ${band.genre} | Pronađi Bend`,
      description,
      url: `${site}/clients/band/${id}`,
      images: band.img
        ? [{ url: band.img, width: 1200, height: 630, alt: `${band.name} — ${band.genre} bend` }]
        : [{ url: '/images/og-cover.png', width: 1200, height: 630, alt: 'Pronađi Bend' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${band.name} — ${band.genre}`,
      description,
    },
  };
}

export default async function BandProfilePage({ params }) {
  const id = params.id;
  const isDemo = typeof id === 'string' && id.startsWith('demo-');

  let band = isDemo ? findDemoBand(id) : null;
  if (!band && !isDemo) {
    band = await fetchBandFromAPI(id);
  }
  if (!band) band = findDemoBand(id);

  return (
    <>
      {band && <BandSchema band={band} />}
      <BandProfileClient params={params} />
    </>
  );
}
