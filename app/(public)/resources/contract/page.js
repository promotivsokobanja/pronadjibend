'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, Download, Printer } from 'lucide-react';

function formatDateSr(iso) {
  if (!iso) return null;
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

function Field({ value, empty = '___________' }) {
  const s = String(value ?? '').trim();
  if (!s) {
    return (
      <span className="contract-placeholder select-none border-b border-dashed border-slate-400 text-slate-500 print:border-slate-600 print:text-slate-700">
        {empty}
      </span>
    );
  }
  return (
    <span className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-[3px] print:font-bold print:text-black print:no-underline">
      {s}
    </span>
  );
}

export default function ContractGeneratorPage() {
  const [poslodavac, setPoslodavac] = useState('');
  const [poslodavacPib, setPoslodavacPib] = useState('');
  const [bend, setBend] = useState('');
  const [bendPib, setBendPib] = useState('');
  const [datum, setDatum] = useState('');
  const [mesto, setMesto] = useState('');
  const [iznos, setIznos] = useState('');
  const [kapara, setKapara] = useState('');
  const [potpisPoslodavac, setPotpisPoslodavac] = useState('');
  const [potpisBend, setPotpisBend] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  const datumTekst = useMemo(() => formatDateSr(datum), [datum]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    const el = document.getElementById('contract-a4-root');
    if (!el) return;
    setPdfLoading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .set({
          margin: [12, 12, 12, 12],
          filename: 'Ugovor-PronadjiBend.pdf',
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: {
            scale: 2,
            logging: false,
            useCORS: true,
            letterRendering: true,
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['.contract-avoid-break'] },
        })
        .from(el)
        .save();
    } catch (e) {
      console.error('PDF:', e);
      window.alert('PDF generisanje nije uspelo. Pokušajte „Odštampaj“ pa u dijalogu „Sačuvaj kao PDF“.');
    } finally {
      setPdfLoading(false);
    }
  }, []);

  return (
    <>
      <style jsx global>{`
        /* A4 pregled na ekranu */
        .contract-a4-sheet {
          width: 210mm;
          max-width: 100%;
          min-height: 297mm;
          margin: 0 auto;
          padding: 18mm 16mm;
          box-sizing: border-box;
          background: #fff;
          color: #0f172a;
          border: 1px solid #e2e8f0;
          box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12);
        }
        @media (max-width: 1023px) {
          .contract-a4-sheet {
            width: 100%;
            min-height: auto;
            padding: 1.25rem;
            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
          }
        }
        @media print {
          @page {
            size: A4;
            margin: 14mm; }
          html,
          body {
            background: #fff !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          nav.navbar,
          footer.footer,
          #notifications,
          .no-print {
            display: none !important;
          }
          #public-main {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
          }
          .contract-a4-sheet {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
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
              Unosite podatke u levoj koloni — <strong className="text-slate-800">tekst na A4 listu desno</strong> se
              menja odmah. Za PDF koristite „Preuzmi PDF“ ili štampu „Sačuvaj kao PDF“.
            </p>
          </header>

          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-10">
            {/* Form */}
            <section
              className="no-print w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:max-w-none lg:max-w-[26rem]"
              aria-label="Podaci za ugovor"
            >
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Unos podataka</h2>
              <div className="flex flex-col gap-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Naziv poslodavca (naručilac)
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
                  PIB ili JMBG poslodavca
                  <input
                    type="text"
                    value={poslodavacPib}
                    onChange={(e) => setPoslodavacPib(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none ring-blue-500/30 transition focus:border-blue-400 focus:bg-white focus:ring-2"
                    placeholder="npr. 123456789"
                    autoComplete="off"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Naziv benda (izvođač)
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
                  JMBG ili PIB benda / odgovornog lica
                  <input
                    type="text"
                    value={bendPib}
                    onChange={(e) => setBendPib(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none ring-blue-500/30 transition focus:border-blue-400 focus:bg-white focus:ring-2"
                    placeholder="npr. 987654321"
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
                  Iznos honorara (navedite valutu u tekstu)
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
                    placeholder="npr. 10.000 RSD"
                    autoComplete="off"
                  />
                </label>
                <div className="border-t border-slate-100 pt-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Potpisi (opciono, za štampu)
                  </p>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Ime i prezime / funkcija (poslodavac)
                    <input
                      type="text"
                      value={potpisPoslodavac}
                      onChange={(e) => setPotpisPoslodavac(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none ring-blue-500/30 transition focus:border-blue-400 focus:bg-white focus:ring-2"
                      placeholder="ispod linije za potpis"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Ime i prezime (bend / odgovorno lice)
                    <input
                      type="text"
                      value={potpisBend}
                      onChange={(e) => setPotpisBend(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none ring-blue-500/30 transition focus:border-blue-400 focus:bg-white focus:ring-2"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={pdfLoading}
                  className="no-print flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <Download size={18} aria-hidden />
                  {pdfLoading ? 'Pravim PDF…' : 'Preuzmi PDF'}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="no-print flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:from-violet-500 hover:to-blue-500"
                >
                  <Printer size={18} aria-hidden />
                  Štampaj
                </button>
              </div>
              <p className="no-print mt-3 text-xs text-slate-500">
                Ovo nije pravni savet. Prilagodite tekst po potrebi i po dogovoru sa stručnjakom.
              </p>
            </section>

            {/* A4 pregled + štampa/PDF */}
            <section
              className="w-full min-w-0 md:sticky md:top-24 md:max-h-[calc(100vh-5rem)] md:overflow-y-auto"
              aria-label="Pregled ugovora"
              aria-live="polite"
            >
              <div className="no-print mb-3 md:mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Pregled A4 (uživo)</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Od širine ekrana ≥768px forma je levo, ugovor desno. Na telefonu — prvo forma, ispod ugovor.
                </p>
              </div>

              <div
                id="contract-a4-root"
                className="contract-a4-sheet contract-print-surface contract-avoid-break"
              >
                <div className="contract-body space-y-4 text-[11pt] leading-relaxed text-slate-800 print:text-[11pt]">
                  <h2 className="text-center text-sm font-black uppercase tracking-tight text-slate-900 sm:text-base">
                    Ugovor o angažovanju muzičkih izvođača
                  </h2>
                  <p className="text-center text-sm sm:text-base">Zaključen u Republici Srbiji, između:</p>

                  <p className="text-sm leading-relaxed sm:text-base">
                    <strong>POSLODAVAC:</strong> <Field value={poslodavac} />, PIB/JMBG:{' '}
                    <Field value={poslodavacPib} /> (u daljem tekstu: Naručilac).
                  </p>
                  <p className="text-sm leading-relaxed sm:text-base">
                    <strong>IZVOĐAČ:</strong> <Field value={bend} />, JMBG/PIB: <Field value={bendPib} /> (u daljem
                    tekstu: Izvođač).
                  </p>

                  <div className="contract-avoid-break space-y-3 border-t border-slate-200 pt-4 text-sm leading-relaxed sm:text-base">
                    <p>
                      <strong>Član 1: Predmet ugovora</strong>
                      <br />
                      Naručilac angažuje Izvođača za muzički nastup dana{' '}
                      <strong>
                        <Field value={datumTekst || ''} empty="[datum nastupa]" />
                      </strong>{' '}
                      u objektu <Field value={mesto} empty="[mesto nastupa]" />.
                    </p>
                    <p>
                      <strong>Član 2: Naknada</strong>
                      <br />
                      Naručilac se obavezuje da Izvođaču isplati neto iznos od <Field value={iznos} empty="[iznos]" /> po
                      dogovoru (navedite valutu u iznosu), odmah nakon nastupa, osim ako strane drugačije ne dogovore.
                    </p>
                    <p>
                      <strong>Član 3: Kapara</strong>
                      <br />
                      Naručilac na dan potpisivanja isplaćuje kaparu od <Field value={kapara} empty="[iznos kapare]" />,
                      koja se u slučaju otkazivanja od strane Naručioca ne vraća, u skladu sa zakonom i međusobnim
                      dogovorom.
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
                      ugovorenog honorara, osim u slučaju više sile.
                    </p>
                  </div>

                  <div className="contract-avoid-break border-t border-slate-200 pt-6 text-sm sm:text-base">
                    <p className="mb-6 font-semibold text-slate-900">Potpisi strana:</p>
                    <div className="grid gap-8 sm:grid-cols-2 sm:gap-12">
                      <div>
                        <p className="mb-2 min-h-[1.5rem] text-center text-sm font-medium text-slate-900">
                          {potpisPoslodavac.trim() || ' '}
                        </p>
                        <div className="mb-1 h-px w-full bg-slate-900 print:bg-black" aria-hidden />
                        <p className="pt-1 text-center text-xs text-slate-600">Naručilac (poslodavac)</p>
                      </div>
                      <div>
                        <p className="mb-2 min-h-[1.5rem] text-center text-sm font-medium text-slate-900">
                          {potpisBend.trim() || ' '}
                        </p>
                        <div className="mb-1 h-px w-full bg-slate-900 print:bg-black" aria-hidden />
                        <p className="pt-1 text-center text-xs text-slate-600">Izvođač (bend)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
