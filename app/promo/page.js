import PromoAdClient from './PromoAdClient';

export const metadata = {
  title: 'Pronađi Bend — Reklama',
  description:
    'Kratka promotivna stranica brenda Pronađi Bend — marketplace za živu muziku u Srbiji.',
  robots: { index: false, follow: true },
};

export default function PromoPage() {
  return <PromoAdClient />;
}
