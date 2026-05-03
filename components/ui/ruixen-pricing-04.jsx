'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import NumberFlow from '@number-flow/react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const PLANS = [
  {
    id: 'basic',
    title: 'Basic',
    desc: 'Za klijente kojima je potreban brz pristup bazi bendova i direktan upit bez mesečne pretplate.',
    monthlyPrice: 0,
    annuallyPrice: 0,
    buttonText: 'Započni besplatno',
    features: ['Pristup bazi bendova', 'Direktni upiti i booking', 'Osnovna pretraga bendova', 'Kontakt kroz platformu'],
    link: '/login?plan=basic',
  },
  {
    id: 'premium',
    title: 'Premium Venue',
    desc: 'Za hotele, restorane i event prostore koji žele prioritetni booking, Live Request i jaču promociju.',
    monthlyPrice: 49,
    annuallyPrice: 350,
    badge: 'Preporučeno',
    buttonText: 'Odaberi Premium plan',
    features: ['Live Request Sistem', 'Prioritetni Booking', 'Promocija na platformi', 'Premium vidljivost'],
    link: '/premium/checkout',
    annualNote: 'Plaćaj godišnje (uštedi 238€)',
  },
];

export default function Pricing_04() {
  const [billPlan, setBillPlan] = useState('monthly');

  const handleSwitch = () => {
    setBillPlan((prev) => (prev === 'monthly' ? 'annually' : 'monthly'));
  };

  return (
    <section className="pricing container ruixen-pricing">
      <div className="ruixen-pricing__header">
        <h2>
          Transparentni <span>Paketi</span>
        </h2>
        <p>Odaberite plan koji odgovara vašim poslovnim potrebama.</p>
        <div className="billing-switch">
          <span>Mesečno</span>
          <button type="button" onClick={handleSwitch} className="billing-switch__toggle" aria-label="Promeni način plaćanja">
            <span className="switch-track" />
            <span
              className={cn(
                'switch-thumb',
                billPlan === 'annually' ? 'translate-x-6' : 'translate-x-0'
              )}
            />
          </button>
          <span>Godišnje</span>
        </div>
      </div>

      <div className="ruixen-pricing__grid">
        {PLANS.map((plan) => (
          <Plan key={plan.id} plan={plan} billPlan={billPlan} />
        ))}
      </div>
    </section>
  );
}

function Plan({ plan, billPlan }) {
  const price = billPlan === 'monthly' ? plan.monthlyPrice : plan.annuallyPrice;
  const suffix = price === 0 ? '' : billPlan === 'monthly' ? '€/mes' : '€/god';
  const billingCopy =
    billPlan === 'monthly'
      ? 'Plaćanje mesečno'
      : plan.annualNote?.length
        ? plan.annualNote
        : 'Plaćanje godišnje (jednokratno)';

  return (
    <div
      className={cn(
        'ruixen-plan-card flex flex-col relative rounded-2xl lg:rounded-3xl transition-all items-start w-full overflow-hidden',
        plan.id === 'premium' && 'is-featured'
      )}
    >
      {plan.badge && <div className="plan-badge">{plan.badge}</div>}

      <div className="plan-body flex rounded-t-2xl lg:rounded-t-3xl flex-col items-start w-full relative">
        <h3 className="font-medium text-xl pt-5">{plan.title}</h3>
        <div className="mt-3 text-2xl font-bold md:text-5xl plan-price">
          {price === 0 ? (
            'Besplatno'
          ) : (
            <NumberFlow value={price} suffix={suffix} format={{ minimumFractionDigits: 0, maximumFractionDigits: 0 }} />
          )}
        </div>
        <p className="text-sm md:text-base mt-2 plan-desc">{plan.desc}</p>
      </div>

      <div className="plan-cta flex flex-col items-start w-full">
        <Button asChild size="lg" className="w-full plan-button">
          <Link href={plan.link}>{plan.buttonText}</Link>
        </Button>
        <div className="h-8 overflow-hidden w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.span
              key={billPlan}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="text-sm text-center mt-3 mx-auto block plan-billing"
            >
              {billingCopy}
            </motion.span>
          </AnimatePresence>
        </div>
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
