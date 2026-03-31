import MusicianProfileClient from './MusicianProfileClient';
import { getSiteUrl } from '@/lib/siteUrl';

async function fetchMusician(id) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || getSiteUrl();
    const res = await fetch(`${baseUrl}/api/musicians/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const musician = await fetchMusician(params.id);

  if (!musician) {
    return {
      title: 'Profil Muzičara — Pronađi Bend',
      description: 'Javni profil muzičara na platformi Pronađi Bend.',
    };
  }

  return {
    title: `${musician.name} — ${musician.primaryInstrument} | Pronađi Bend`,
    description:
      musician.bio ||
      `${musician.name} svira ${musician.primaryInstrument} (${musician.city}). Pogledajte profil i pošaljite upit za saradnju.`,
    alternates: { canonical: `/muzicari/${params.id}` },
    openGraph: {
      title: `${musician.name} — ${musician.primaryInstrument}`,
      description:
        musician.bio ||
        `${musician.name} • ${musician.primaryInstrument} • ${musician.city}`,
      url: `${getSiteUrl()}/muzicari/${params.id}`,
      images: musician.img
        ? [{ url: musician.img, width: 1200, height: 630, alt: `${musician.name} profil` }]
        : [{ url: '/images/og-cover.png', width: 1200, height: 630, alt: 'Pronađi Bend' }],
    },
  };
}

export default function MusicianProfilePage({ params }) {
  return <MusicianProfileClient musicianId={params.id} />;
}
