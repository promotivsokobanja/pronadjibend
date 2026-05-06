'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import NumberFlow from '@number-flow/react';
import { CheckIcon, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PLANS = [
  {
    id: 'basic',
    title: 'Basic',
    desc: 'Za klijente kojima je potreban brz pristup bazi bendova i direktan upit bez mesečne pretplate.',
    price: 0,
    buttonText: 'Započni besplatno',
    features: [
      'Pristup bazi bendova',
      'Direktni upiti i booking',
      'Osnovna pretraga bendova',
      'Kontakt kroz platformu',
    ],
    link: '/login?plan=basic',
  },
  {
    id: 'premium',
    title: 'Premium',
    desc: 'Za muzičare koji žele napredne alate — MIDI biblioteku, chat i prioritet u pretrazi.',
    price: 49,
    buttonText: 'Odaberi Premium',
    features: [
      'MIDI biblioteka',
      'Više aktivnih poziva muzičarima',
      'Chat komunikacija',
      'Prioritet u pretrazi',
    ],
    link: '/upgrade',
  },
  {
    id: 'premium_venue',
    title: 'Premium Venue',
    desc: 'Za bendove i prostore koji žele maksimalne mogućnosti — Korg PA setovi, video i audio upload.',
    price: 79,
    badge: 'Preporučeno',
    buttonText: 'Odaberi Premium Venue',
    features: [
      'Sve iz Premium plana',
      'Korg PA setovi (download)',
      'Video upload na profil',
      'Audio (MP3) upload',
      'Maksimalan broj poziva',
    ],
    link: '/upgrade',
  },
];

export default function Pricing_04() {
  return (
    <section className="pricing container ruixen-pricing">
      <div className="ruixen-pricing__header">
        <h2>
          Transparentni <span>Paketi</span>
        </h2>
        <p>Odaberite plan koji odgovara vašim potrebama. Plaćanje putem IPS QR koda — mesečno.</p>
        <div className="ruixen-pricing__qr-note">
          <QrCode size={15} aria-hidden />
          Uplata putem mobilnog bankarstva · NBS IPS standard · PDF račun na email
        </div>
      </div>

      <div className="ruixen-pricing__grid">
        {PLANS.map((plan) => (
          <Plan key={plan.id} plan={plan} />
        ))}
      </div>
    </section>
  );
}

function Plan({ plan }) {
  return (
    <div
      className={cn(
        'ruixen-plan-card flex flex-col relative rounded-2xl lg:rounded-3xl transition-all items-start w-full overflow-hidden',
        plan.id === 'premium_venue' && 'is-featured'
      )}
    >
      {plan.badge && <div className="plan-badge">{plan.badge}</div>}

      <div className="plan-body flex rounded-t-2xl lg:rounded-t-3xl flex-col items-start w-full relative">
        <h3 className="font-medium text-xl pt-5">{plan.title}</h3>
        <div className="mt-3 text-2xl font-bold md:text-5xl plan-price">
          {plan.price === 0 ? (
            'Besplatno'
          ) : (
            <NumberFlow value={plan.price} suffix="€/mes" format={{ minimumFractionDigits: 0, maximumFractionDigits: 0 }} />
          )}
        </div>
        <p className="text-sm md:text-base mt-2 plan-desc">{plan.desc}</p>
      </div>

      <div className="plan-cta flex flex-col items-start w-full">
        <Button asChild size="lg" className="w-full plan-button">
          <Link href={plan.link}>{plan.buttonText}</Link>
        </Button>
        <p className="text-sm text-center mt-3 mx-auto block plan-billing">
          {plan.price === 0 ? 'Bez kreditne kartice' : 'Plaćanje mesečno · IPS QR'}
        </p>
      </div>

      <div className="plan-features flex flex-col items-start w-full gap-y-2">
        <span className="text-base text-left mb-2">Uključuje:</span>
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-center justify-start gap-2">
            <div className="flex items-center justify-center feature-icon">
              <CheckIcon className="size-5" />
            </div>
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
