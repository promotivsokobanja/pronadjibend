import AboutClient from './AboutClient';
import { getSiteUrl } from '@/lib/siteUrl';

const siteUrl = getSiteUrl();

export const metadata = {
  title: 'O Nama — Pronađi Bend | Platforma za Iznajmljivanje Bendova u Srbiji',
  description:
    'Pronađi Bend je digitalna platforma koja spaja klijente i proverene muzičare. Pomažemo restoranima, hotelima i organizatorima da brzo pronađu bend za svadbu, proslavu ili korporativni event.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'O Nama — Pronađi Bend',
    description: 'Digitalni most između muzičara i najboljih lokala u Srbiji. 500+ bendova, 1500+ nastupa.',
    url: `${siteUrl}/about`,
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
