'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

function displayVal(v, fallback = '___________') {
  const s = String(v ?? '').trim();
  return s || fallback;
}

function formatDateSr(iso) {
  if (!iso) return '___________';
  try {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('sr-Latn-RS', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function ContractGeneratorPage() {
  const [poslodavac, setPoslodavac] = useState('');
  const [bend, setBend] = useState('');
  const [datum, setDatum] = useState('');
  const [mesto, setMesto] = useState('');
  const [iznos, setIznos] = useState('');
  const [kapara, setKapara] = useState('');

  const datumTekst = useMemo(() => formatDateSr(datum), [datum]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .contract-print-surface,
          .contract-print-surface * {
            visibility: visible;
          }
          .contract-print-surface {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding: 12mm 16mm;
            background: #fff !important;
            color: #000 !important;
            box-shadow: none !important;
            border: none !important;
            font-size: 11pt;
            line-height: 1.45;
          }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 pb-16 pt-[calc(var(--navbar-height)+1.5rem)] text-slate-900 print:bg-white print:pb-0 print:pt-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <nav className="no-print mb-8 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft size={16} aria-hidden />
              Nazad
            </Link>
          </nav>

          <header className="no-print mb-8">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Generator ugovora o angažovanju muzičara
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Popunite polja levo — tekst desno se menja odmah. Za PDF koristite „Odštampaj ugovor“, pa u dijalogu
              izaberite „Sačuvaj kao PDF“ (Chrome / Edge).
            </p>
          </header>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
            {/* Form */}
            <section
              className="no-print w-full shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-28 lg:max-w-md lg:self-start print:hidden"
              aria-label="Podaci za ugovor"
            >
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Unos podataka</h2>
              <div className="flex flex-col gap-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Naziv poslodavca
                  <input
                    type="text"
                    value={poslodavac}
                    onChange={(e) => setPoslodavac(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none ring-blue-500/30 transition focus:border-blue-400 focus:bg-white focus:ring-2"
                    placeholder="npr. Restoran „X“ DOO"
                    autoComplete="organization"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Naziv benda
                  <input
                    type="text"
                    value={bend}
                    onChange={(e) => setBend(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none ring-blue-500/30 transition focus:border-blue-400 focus:bg-white focus:ring-2"
                    placeholder="npr. Bend „Y“"
                    autoComplete="off"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Datum nastupa
                  <input
                    type="date"
                    value={datum}
                    onChange={(e) => setDatum(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none ring-blue-500/30 transition focus:border-blue-400 focus:bg-white focus:ring-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Mesto nastupa
                  <input
                    type="text"
                    value={mesto}
                    onChange={(e) => setMesto(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none ring-blue-500/30 transition focus:border-blue-400 focus:bg-white focus:ring-2"
                    placeholder="npr. Beograd, Bulevar kralja Aleksandra 1"
                    autoComplete="street-address"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Iznos honorara
                  <input
                    type="text"
                    value={iznos}
                    onChange={(e) => setIznos(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none ring-blue-500/30 transition focus:border-blue-400 focus:bg-white focus:ring-2"
                    placeholder="npr. 50.000 RSD ili 450 EUR"
                    autoComplete="off"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Iznos kapare
                  <input
                    type="text"
                    value={kapara}
                    onChange={(e) => setKapara(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none ring-blue-500/30 transition focus:border-blue-400 focus:bg-white focus:ring-2"
                    placeholder="npr. 10.000"
                    autoComplete="off"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handlePrint}
                className="no-print mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:from-violet-500 hover:to-blue-500 print:hidden"
              >
                <Printer size={18} aria-hidden />
                Odštampaj ugovor
              </button>
              <p className="no-print mt-3 text-xs text-slate-500 print:hidden">
                Ovo nije pravni savet. Prilagodite tekst po potrebi i po dogovoru sa stručnjakom.
              </p>
            </section>

            {/* Preview + print surface */}
            <section className="w-full min-w-0 flex-1" aria-label="Pregled ugovora">
              <div className="no-print mb-3 flex items-center justify-between lg:hidden">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Pregled</h2>
              </div>

              <div className="contract-print-surface rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
                <div className="contract-body space-y-4 text-slate-800">
                  <h2 className="text-center text-base font-black uppercase tracking-tight text-slate-900 sm:text-lg">
                    Ugovor o angažovanju muzičkih izvođača
                  </h2>
                  <p className="text-center text-sm sm:text-base">Zaključen u Republici Srbiji, između:</p>

                  <p className="text-sm leading-relaxed sm:text-base">
                    <strong>POSLODAVAC:</strong> {displayVal(poslodavac)}, PIB/JMBG: ___________ (u daljem tekstu:
                    Naručilac).
                  </p>
                  <p className="text-sm leading-relaxed sm:text-base">
                    <strong>IZVOĐAČ:</strong> {displayVal(bend)}, JMBG/PIB: ___________ (u daljem tekstu: Izvođač).
                  </p>

                  <div className="space-y-3 border-t border-slate-200 pt-4 text-sm leading-relaxed sm:text-base">
                    <p>
                      <strong>Član 1: Predmet ugovora</strong>
                      <br />
                      Naručilac angažuje Izvođača za muzički nastup dana <strong>{datumTekst}</strong> u objektu{' '}
                      <strong>{displayVal(mesto)}</strong>.
                    </p>
                    <p>
                      <strong>Član 2: Naknada</strong>
                      <br />
                      Naručilac se obavezuje da Izvođaču isplati neto iznos od <strong>{displayVal(iznos)}</strong>{' '}
                      RSD/EUR odmah nakon nastupa.
                    </p>
                    <p>
                      <strong>Član 3: Kapara</strong>
                      <br />
                      Naručilac na dan potpisivanja isplaćuje kaparu od <strong>{displayVal(kapara)}</strong> RSD, koja
                      se u slučaju otkazivanja od strane Naručioca ne vraća.
                    </p>
                    <p>
                      <strong>Član 4: Obaveze</strong>
                      <br />
                      Izvođač se obavezuje na profesionalan nastup sa ispravnom opremom. Naručilac obezbeđuje adekvatan
                      prostor i strujno napajanje.
                    </p>
                    <p>
                      <strong>Član 5: Otkazivanje</strong>
                      <br />
                      Strana koja otkaže nastup manje od 30 dana pre događaja, dužna je da drugoj strani nadoknadi 50%
                      ugovorenog honorara.
                    </p>
                  </div>

                  <p className="border-t border-slate-200 pt-6 text-sm sm:text-base">
                    Potpisi strana: _________________ / _________________
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
