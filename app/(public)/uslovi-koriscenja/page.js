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
          Poslednje ažuriranje: 28.03.2026.
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

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">9. Pretplate i plaćanje</h2>
          <div className="mt-3 text-slate-700 space-y-3">
            <p>
              Platforma nudi besplatni (Basic) i plaćene planove (Premium, Premium Venue).
              Pretplata se aktivira nakon potvrde uplate i važi 30 dana od dana aktivacije.
            </p>
            <p>
              Plaćanje se vrši putem IPS QR koda (NBS standard) ili platnom karticom putem
              Stripe servisa. Korisniku se nakon uplate izdaje elektronski račun (PDF) na
              registrovanu email adresu.
            </p>
            <p>
              <strong>Politika povrata:</strong> Korisnik može zatražiti povrat sredstava u
              roku od 14 dana od aktivacije pretplate ukoliko nije koristio Premium
              funkcionalnosti. Zahtev za povrat šalje se na{' '}
              <a className="text-[#007AFF]" href="mailto:office@pronadjibend.rs">office@pronadjibend.rs</a>.
              Nakon isteka 14 dana ili korišćenja Premium funkcija, povrat nije moguć.
            </p>
            <p>
              Pretplata se ne obnavlja automatski. Tri dana pre isteka korisnik dobija
              email podsetnik sa mogućnošću obnove.
            </p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">10. Otkazivanje naloga i brisanje podataka</h2>
          <div className="mt-3 text-slate-700 space-y-3">
            <p>
              Korisnik ima pravo da u svakom trenutku zatraži brisanje svog naloga i
              povezanih podataka slanjem zahteva na{' '}
              <a className="text-[#007AFF]" href="mailto:office@pronadjibend.rs">office@pronadjibend.rs</a>.
            </p>
            <p>
              Nakon prijema zahteva, nalog i podaci biće obrisani u roku od 30 dana,
              osim podataka koje smo u obavezi da čuvamo po zakonu (npr. fiskalni dokumenti).
            </p>
            <p>
              Brisanje naloga je nepovratno. Sve aktivne pretplate prestaju da važe danom
              brisanja bez prava na povrat za preostali period.
            </p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">11. Live nastup, digitalna pesmarica i bakšiš</h2>
          <p className="mt-3 text-slate-700">
            Funkcije uživo (zahtevi pesama, obaveštenja bendu, opcioni predlozi bakšiša) služe kao tehnička podrška
            događaju. Bend i ustanova dogovoravaju pravila ponašanja gostiju i osoblja. Isplate bakšiša u gotovom,
            preko konobara ili na drugi dogovoreni način, regulišu ugovorne strane izvan okvira platforme, osim ako
            posebnim produktom nije drugačije uređeno. Zabranjeno je zloupotrebljavanje ovih funkcija radi prevare ili
            pritiska na goste.
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
