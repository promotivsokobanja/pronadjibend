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
    desc: 'Za bendove koji žele da se predstave online i prime zahteve publike na nastupima.',
    price: 0,
    buttonText: 'Započni besplatno',
    features: [
      'Profil benda sa kontaktom',
      'Live Request (do 3 po sesiji)',
      'Pregled MIDI biblioteke (bez downloada)',
      'Do 2 chat konverzacije',
      'Do 5 pozivnica muzičarima',
    ],
    link: '/login?plan=basic',
  },
  {
    id: 'premium',
    title: 'Premium',
    desc: 'Za aktivne muzičare — neograničen Live Request, MIDI download, chat i dodavanje pesama.',
    price: 49,
    buttonText: 'Odaberi Premium',
    features: [
      'Live Request (neograničeno)',
      'MIDI biblioteka (download + upload)',
      'Dodavanje pesama u repertoar',
      'Neograničen chat',
      'Do 20 pozivnica muzičarima',
      'Prioritet u pretrazi',
    ],
    link: '/upgrade',
  },
  {
    id: 'premium_venue',
    title: 'Premium Venue',
    desc: 'Za bendove i lokale koji žele sve — Korg PA setovi, video, audio i maksimalne mogućnosti.',
    price: 79,
    badge: 'Preporučeno',
    buttonText: 'Odaberi Premium Venue',
    features: [
      'Sve iz Premium plana',
      'Korg PA setovi (download)',
      'Video upload na profil',
      'Audio (MP3) upload',
      'Maksimalan broj pozivnica',
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
        <p>Odaberite plan koji odgovara vašim potrebama. Mesečna pretplata — uplata putem banke.</p>
        <div className="ruixen-pricing__qr-note">
          <QrCode size={15} aria-hidden />
          Mobilno bankarstvo ili šalter · IPS QR · PDF nalog za uplatu
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
