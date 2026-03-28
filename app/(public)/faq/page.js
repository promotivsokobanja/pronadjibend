import FAQClient from './FAQClient';
import { FAQSchema } from '@/components/JsonLd';
import { faqData } from '@/lib/faqData';
import { getSiteUrl } from '@/lib/siteUrl';

const siteUrl = getSiteUrl();

export const metadata = {
  title: 'Česta Pitanja (FAQ) — Kako Rezervisati Bend | Pronađi Bend',
  description:
    'Odgovori na najčešća pitanja o platformi Pronađi Bend: kako rezervisati bend za svadbu, kako funkcioniše Live Request, cene nastupa, registracija muzičara i još mnogo toga.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'Česta Pitanja — Pronađi Bend',
    description: 'Saznajte sve o rezervaciji bendova, Live Request sistemu, cenama i registraciji na platformi.',
    url: `${siteUrl}/faq`,
  },
};

export default function FAQPage() {
  return (
    <>
      <FAQSchema faqs={faqData} />
      <FAQClient />
    </>
  );
}
