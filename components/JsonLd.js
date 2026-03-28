import { getSiteUrl } from '@/lib/siteUrl';

export default function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationSchema() {
  const site = getSiteUrl();
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Pronađi Bend',
    alternateName: 'PronadjiBend',
    url: site,
    logo: `${site}/images/logo.png`,
    description:
      'Vodeća digitalna platforma za iznajmljivanje bendova i muzičara u Srbiji. Pronađite savršen bend za svadbu, restoran, hotel ili proslavu.',
    foundingDate: '2025',
    areaServed: {
      '@type': 'Country',
      name: 'Serbia',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+381-64-339-2339',
      email: 'office@pronadjibend.rs',
      contactType: 'customer service',
      availableLanguage: ['Serbian', 'English'],
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Sokobanja',
      addressCountry: 'RS',
    },
    sameAs: ['https://instagram.com/pronadjiband'],
  };
  return <JsonLd data={data} />;
}

export function ServiceSchema() {
  const site = getSiteUrl();
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Iznajmljivanje Bendova i Muzičara',
    provider: {
      '@type': 'Organization',
      name: 'Pronađi Bend',
      url: site,
    },
    serviceType: 'Entertainment',
    description:
      'Online platforma za rezervaciju bendova za svadbe, hotele, restorane i proslave. Pretraga po žanru, lokaciji i ceni. Digitalni repertoar i Live Request sistem.',
    areaServed: {
      '@type': 'Country',
      name: 'Serbia',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Bendovi za iznajmljivanje',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Bend za svadbu',
            description: 'Profesionalni bendovi za venčanja i svadbene proslave',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Muzika za restorane i hotele',
            description: 'Ambijentalna i živa muzika za ugostiteljske objekte',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Bend za korporativni event',
            description: 'Profesionalni muzičari za poslovne događaje i proslave',
          },
        },
      ],
    },
  };
  return <JsonLd data={data} />;
}

export function WebSiteSchema() {
  const site = getSiteUrl();
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Pronađi Bend',
    url: site,
    description: 'Platforma za iznajmljivanje bendova i muzičara u Srbiji',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${site}/clients?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
  return <JsonLd data={data} />;
}

export function FAQSchema({ faqs }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };
  return <JsonLd data={data} />;
}

export function BandSchema({ band }) {
  const site = getSiteUrl();
  const rawImg = band.img && String(band.img).trim();
  const imageUrl = rawImg
    ? rawImg.startsWith('http')
      ? rawImg
      : `${site}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`
    : `${site}/images/logo.png`;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: band.name,
    genre: band.genre,
    description: band.bio || `${band.name} — ${band.genre} bend iz grada ${band.location}`,
    image: imageUrl,
    location: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: band.location,
        addressCountry: 'RS',
      },
    },
    url: `${site}/clients/band/${band.id}`,
    ...(band.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: band.rating,
        bestRating: 5,
        worstRating: 1,
        ratingCount: band.reviews?.length || 1,
      },
    }),
    makesOffer: {
      '@type': 'Offer',
      description: `Nastup uživo — ${band.genre}`,
      priceSpecification: {
        '@type': 'PriceSpecification',
        priceCurrency: 'EUR',
        price: band.priceRange || 'Po dogovoru',
      },
      availability: 'https://schema.org/InStock',
      areaServed: { '@type': 'Country', name: 'Serbia' },
      availableAtOrFrom: {
        '@type': 'Place',
        name: band.location,
      },
    },
  };
  return <JsonLd data={data} />;
}
