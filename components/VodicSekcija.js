import Link from 'next/link';
import { Shield, Wallet, LayoutDashboard, Sparkles } from 'lucide-react';

const cards = [
  {
    icon: Shield,
    title: 'Privatnost gosta',
    text:
      'Gosti šalju zahtev sa broja stola, bez obavezne registracije. Podaci ostaju u okviru večeri i vašeg dogovora sa lokalom — diskretnije od javnog lista ili grupnih poruka.',
  },
  {
    icon: Wallet,
    title: 'Digitalni bakšiš',
    text:
      'Jasniji tok narudžbina i manje prekidanja na bini često znače zadovoljniju publiku i bolje ocene nastupa. Digitalna pesmarica i Live Dashboard pomažu da se fokus ostane na muzici i atmosferi.',
  },
  {
    icon: LayoutDashboard,
    title: 'Lakša organizacija',
    text:
      'Jedan ekran za red zahteva, tekstove i repertoar smanjuje haos između setova. QR link vodi goste direktno na vašu listu pesama, a vi vidite šta je na čekanju u realnom vremenu.',
  },
];

export default function VodicSekcija() {
  return (
    <section
      id="vodic"
      aria-labelledby="vodic-heading"
      className="scroll-mt-[calc(var(--navbar-height)+0.5rem)] w-full max-w-full min-w-0 overflow-x-hidden border-t border-slate-200/80 bg-gray-50 px-4 py-16 text-slate-800 md:px-0 md:py-24 [.theme-dark_&]:border-white/10 [.theme-dark_&]:bg-zinc-950 [.theme-dark_&]:text-slate-100"
    >
      <div className="mx-auto w-full min-w-0 max-w-5xl px-0 sm:px-4 md:px-6">
        <div className="mx-auto w-full min-w-0 max-w-3xl text-center">
          <p className="mb-3 flex flex-wrap items-center justify-center gap-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-500 [.theme-dark_&]:text-slate-400">
            <Sparkles className="h-4 w-4 shrink-0 text-[#007AFF]" aria-hidden />
            Za bendove
          </p>
          <h2
            id="vodic-heading"
            className="text-balance px-1 text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl [.theme-dark_&]:text-white"
          >
            Digitalna revolucija za tvoj bend
          </h2>
          <div className="mt-6 space-y-4 text-center text-base leading-relaxed text-slate-600 sm:text-lg [.theme-dark_&]:text-slate-300">
            <p>
              Savremeni nastup nije samo zvuk i svetlo — očekuje se i digitalna usluga. QR pesmarica omogućava gostima da
              pregledaju vaš repertoar i pošalju zahtev bez gužve na binu, dok vi na{' '}
              <strong className="font-semibold text-slate-800 [.theme-dark_&]:text-white">Live Dashboard-u</strong>{' '}
              vidite red, prihvatate ili preskačete stavke i držite kontrolu nad večeri.
            </p>
            <p>
              Takav tok smanjuje prekide, profesionalizuje komunikaciju sa lokalom i često doprinosi boljem iskustvu
              publike — što se u praksi odražava i na zadovoljstvo gostiju i na mogućnost većeg bakšiša zahvaljujući
              jasnijoj usluzi i manje haotičnoj atmosferi.
            </p>
          </div>
        </div>

        <ul className="mt-14 grid w-full min-w-0 max-w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="flex min-w-0 max-w-full flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md [.theme-dark_&]:border-white/10 [.theme-dark_&]:bg-zinc-900/80"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#007AFF]/10 text-[#007AFF] [.theme-dark_&]:bg-[#007AFF]/20">
                <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
              </div>
              <h3 className="text-balance text-lg font-bold text-slate-900 [.theme-dark_&]:text-white">{title}</h3>
              <p className="mt-2 min-w-0 max-w-full flex-1 text-pretty text-sm leading-relaxed text-slate-600 [.theme-dark_&]:text-slate-400">
                {text}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-14 flex w-full min-w-0 max-w-full flex-col items-center gap-4 px-0 text-center">
          <Link
            href="/bands/profile"
            className="inline-flex min-h-[3.25rem] w-full max-w-full min-w-0 items-center justify-center rounded-full bg-[#007AFF] px-6 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#0066dd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] sm:max-w-md sm:px-8 sm:text-lg"
          >
            Aktiviraj svoj PRO sistem
          </Link>
          <p className="mx-auto w-full min-w-0 max-w-md text-sm text-slate-500 [.theme-dark_&]:text-slate-500">
            Podesite profil benda i iskoristite alate platforme za nastupe uživo.
          </p>
        </div>
      </div>
    </section>
  );
}
