import Link from 'next/link';

const profileCards = [
  {
    href: '/dashboard',
    title: 'Profil Benda',
    desc: 'Uredi podatke benda, live podešavanja i repertoar.',
  },
  {
    href: '/berza',
    title: 'Profil Muzičara',
    desc: 'Uredi instrument, grad, iskustvo i dostupnost na berzi.',
  },
];

export default function ProfilPage() {
  return (
    <section className="space-y-4">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Moj Profil</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">Izaberi tip profila</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {profileCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
          >
            <h2 className="text-lg font-bold text-slate-900">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{card.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
