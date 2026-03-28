import Link from 'next/link';

export const metadata = {
  title: 'Politika Privatnosti — Pronađi Bend',
  description:
    'Saznajte kako platforma Pronađi Bend obrađuje vaše podatke o ličnosti u skladu sa zakonima Republike Srbije.',
  alternates: { canonical: '/privatnost' },
};

export default function PrivatnostPage() {
  return (
    <main className="container py-24">
      <article className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          Politika privatnosti
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          Poslednje ažuriranje: 27.03.2026.
        </p>

        <section className="mt-8 space-y-4 text-slate-700">
          <p>
            Ova politika privatnosti objašnjava kako platforma Pronadji Bend obrađuje
            podatke o ličnosti korisnika u skladu sa Zakonom o zaštiti podataka o
            ličnosti Republike Srbije („Sl. glasnik RS“, br. 87/2018).
          </p>
          <p>
            Korišćenjem sajta potvrđujete da ste pročitali ovu politiku i da ste
            upoznati sa načinom obrade vaših podataka.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">1. Rukovalac podacima</h2>
          <p className="mt-3 text-slate-700">
            Rukovalac podacima je pravno/fizičko lice koje upravlja platformom
            Pronadji Bend. Kontakt za pitanja o privatnosti:
            {' '}
            <a className="text-[#007AFF]" href="mailto:office@pronadjibend.rs">
              office@pronadjibend.rs
            </a>.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">2. Koje podatke prikupljamo</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
            <li>identifikacione i kontakt podatke (npr. ime, email, telefon),</li>
            <li>podatke o profilu benda/klijenta i upitima za nastupe,</li>
            <li>tehničke podatke (IP adresa, tip uređaja, log podaci),</li>
            <li>podatke potrebne za realizaciju rezervacija i komunikacije.</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">3. Svrha i pravni osnov obrade</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
            <li>izvršenje ugovora i pružanje usluge platforme,</li>
            <li>ispunjavanje zakonskih obaveza,</li>
            <li>legitimni interes (bezbednost, sprečavanje zloupotreba, analitika),</li>
            <li>pristanak, kada je primenljivo (npr. marketinške poruke).</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">4. Deljenje podataka</h2>
          <p className="mt-3 text-slate-700">
            Podaci se mogu deliti sa pružaocima tehničkih usluga i partnerima
            neophodnim za rad platforme, uz odgovarajuće ugovorne i bezbednosne mere.
            Podaci se ne prodaju trećim licima.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">5. Rok čuvanja podataka</h2>
          <p className="mt-3 text-slate-700">
            Podaci se čuvaju onoliko koliko je potrebno za svrhu obrade, odnosno do
            isteka zakonskih rokova čuvanja i zastarelosti potraživanja.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">6. Vaša prava</h2>
          <p className="mt-3 text-slate-700">
            Imate pravo na pristup, ispravku, brisanje, ograničenje obrade, prenosivost
            podataka i prigovor. Zahtev možete poslati na
            {' '}
            <a className="text-[#007AFF]" href="mailto:office@pronadjibend.rs">
              office@pronadjibend.rs
            </a>.
            Takođe imate pravo pritužbe Povereniku za informacije od javnog značaja i
            zaštitu podataka o ličnosti.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">7. Kolačići (cookies)</h2>
          <p className="mt-3 text-slate-700">
            Sajt može koristiti neophodne i analitičke kolačiće radi pravilnog rada i
            unapređenja usluge. Podešavanja kolačića možete kontrolisati kroz vaš browser.
          </p>
        </section>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <Link href="/" className="text-sm font-semibold text-[#007AFF]">
            Nazad na početnu
          </Link>
        </div>
      </article>
    </main>
  );
}
