import Link from 'next/link';

export const metadata = {
  title: 'Uslovi Korišćenja — Pronađi Bend',
  description:
    'Uslovi korišćenja platforme Pronađi Bend. Pravila za korisnike, muzičare i klijente u skladu sa zakonima Republike Srbije.',
  alternates: { canonical: '/uslovi-koriscenja' },
};

export default function UsloviKoriscenjaPage() {
  return (
    <main className="container py-24">
      <article className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          Uslovi korišćenja
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          Poslednje ažuriranje: 27.03.2026.
        </p>

        <section className="mt-8 space-y-4 text-slate-700">
          <p>
            Ovi uslovi uređuju korišćenje platforme Pronadji Bend i primenjuju se na sve
            korisnike sajta. Korišćenjem sajta prihvatate ove uslove.
          </p>
          <p>
            Uslovi su sastavljeni u skladu sa relevantnim propisima Republike Srbije,
            uključujući Zakon o obligacionim odnosima i Zakon o elektronskoj trgovini.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">1. Opis usluge</h2>
          <p className="mt-3 text-slate-700">
            Pronadji Bend je platforma koja povezuje klijente i muzičke izvođače radi
            slanja upita, ugovaranja nastupa i digitalne komunikacije tokom događaja.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">2. Nalozi i odgovornost korisnika</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
            <li>korisnik je odgovoran za tačnost unetih podataka,</li>
            <li>zabranjeno je lažno predstavljanje i zloupotreba platforme,</li>
            <li>korisnik je odgovoran za bezbednost svojih pristupnih podataka.</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">3. Ugovaranje nastupa</h2>
          <p className="mt-3 text-slate-700">
            Platforma olakšava kontakt i organizaciju između korisnika, ali ne garantuje
            zaključenje ugovora između strana. Konačni uslovi nastupa (cena, termin,
            trajanje, tehnički uslovi) dogovaraju se direktno između ugovornih strana.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">4. Zabranjene radnje</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
            <li>unošenje nezakonitog, uvredljivog ili obmanjujućeg sadržaja,</li>
            <li>narušavanje rada platforme i pokušaji neovlašćenog pristupa,</li>
            <li>korišćenje podataka drugih korisnika suprotno važećim zakonima.</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">5. Ograničenje odgovornosti</h2>
          <p className="mt-3 text-slate-700">
            Platforma se pruža „takva kakva jeste“. U meri dozvoljenoj zakonom, Pronadji
            Bend ne odgovara za indirektnu štetu nastalu korišćenjem ili nemogućnošću
            korišćenja platforme.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">6. Intelektualna svojina</h2>
          <p className="mt-3 text-slate-700">
            Sadržaj platforme (dizajn, tekstovi, vizuelni elementi i kod) zaštićen je
            pravima intelektualne svojine i ne sme se koristiti bez dozvole nosioca prava.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">7. Izmene uslova</h2>
          <p className="mt-3 text-slate-700">
            Zadržavamo pravo izmene ovih uslova. Ažurirana verzija biće objavljena na ovoj
            stranici sa datumom poslednje izmene.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">8. Merodavno pravo i nadležnost</h2>
          <p className="mt-3 text-slate-700">
            Na ove uslove primenjuje se pravo Republike Srbije. Za sporove je nadležan
            stvarno nadležni sud u Republici Srbiji, osim ako obavezni propisi ne određuju
            drugačije.
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
