import Link from 'next/link';

const cards = [
  {
    href: '/live/demo',
    title: 'Live za goste',
    text: 'Naručivanje pesama sa opcijom bakšiša preko konobara.',
  },
  {
    href: '/dashboard',
    title: 'Dashboard benda',
    text: 'Pregled zahteva u realnom vremenu i status nastupa.',
  },
  {
    href: '/berza',
    title: 'Berza muzičara',
    text: 'Pretraga dostupnih muzičara po instrumentu i gradu.',
  },
  {
    href: '/profil',
    title: 'Moj profil',
    text: 'Izbor između uređivanja band i musician profila.',
  },
];

export default function HomePage() {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Total Rebuild</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Pronađi Bend
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
          Nova osnova aplikacije za jedan domen, čist App Router i stabilan tok za live narudžbine.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow"
          >
            <h2 className="text-lg font-bold text-slate-900">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{card.text}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
