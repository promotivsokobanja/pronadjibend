'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, ArrowRight, Sparkles } from 'lucide-react';

const scrollFade = {
  initial: { opacity: 1, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-48px' },
  transition: { duration: 0.48, ease: [0.16, 1, 0.3, 1] },
};

const KEY_TAGS = [
  'bend za svadbu',
  'živa muzika',
  'muzika za svadbu Srbija',
  'iznajmljivanje benda',
  'venčanje 2026',
  'Beograd i region',
];

export default function HomeBlogGuideSection() {
  return (
    <motion.section
      className="home-blog-guide container"
      id="vodic-blog"
      aria-labelledby="home-blog-guide-heading"
      {...scrollFade}
    >
      <div className="home-blog-guide__intro">
        <span className="home-blog-guide__eyebrow">
          <BookOpen size={16} aria-hidden />
          Blog / Vodič
        </span>
        <h2 id="home-blog-guide-heading" className="home-blog-guide__h2">
          Saveti za <span className="gradient-text">savršenu svadbu</span>
        </h2>
        <p className="home-blog-guide__lede">
          Praktičan vodič za mladence i organizatore — kako da u 2026. godini odaberete bend koji odgovara vašem stilu,
          budžetu i lokaciji, bez stresa u poslednjem trenutku.
        </p>
      </div>

      <article className="home-blog-guide__article glass-card">
        <header className="home-blog-guide__article-head">
          <div className="home-blog-guide__badge-row">
            <span className="home-blog-guide__pill home-blog-guide__pill--accent">
              <Sparkles size={14} aria-hidden />
              2026
            </span>
            <span className="home-blog-guide__pill">~6 min čitanja</span>
          </div>
          <h3 className="home-blog-guide__h3">
            Kako odabrati pravi bend za svadbu u Srbiji 2026. godine
          </h3>
          <p className="home-blog-guide__dek">
            Od <strong>muzike za svadbu</strong> i <strong>žive muzike za venčanje</strong> do dogovora oko cene i
            tehničkih detalja — evo šta iskusni organizatori provere pre rezervacije.
          </p>
          <ul className="home-blog-guide__tags" aria-label="Ključne teme">
            {KEY_TAGS.map((tag) => (
              <li key={tag}>
                <span className="home-blog-guide__tag">{tag}</span>
              </li>
            ))}
          </ul>
        </header>

        <div className="home-blog-guide__body">
          <p>
            <strong>Bend za svadbu</strong> često zakazujemo mesecima unapred — posebno za vikende u sezoni (maj–septembar).
            Ako planirate <strong>svadbu u Beogradu</strong>, <strong>Novom Sadu</strong> ili manjem mestu, prvi korak je
            uskladiti <strong>žanr</strong> (zabavna, narodna, pop/rock, akustični koktel) sa profilom gostiju i delom
            večeri (aperitiv, večera, žurka). Mnogi parovi kombinuju <strong>živu muziku i DJ-a</strong>; dogovorite ko
            vodi koji segment da nema preklapanja u zvuku.
          </p>

          <h4 className="home-blog-guide__h4">1. Budžet i šta ulazi u ponudu</h4>
          <p>
            <strong>Cena benda za svadbu</strong> zavisi od trajanja nastupa, broja članova, prevoza i opreme. Pitajte da
            li su u cenu uračunati <strong>ozvučenje i rasveta</strong> (rider), kao i eventualni <strong>nadoknada
            puta</strong>. Transparentna ponuda olakšava poređenje kada <strong>iznajmljujete bend</strong> preko platforme
            — jasno vidite opis, lokaciju i stil.
          </p>

          <h4 className="home-blog-guide__h4">2. Prostor i akustika</h4>
          <p>
            <strong>Restoran za svadbu</strong> ili <strong>salon za venčanje</strong> ima drugačiju akustiku od bašte ili
            šatora. Bend treba da zna kvadraturu i ograničenja buke; proverite da li objekat ima dovoljno priključaka za
            <strong> živu muziku uživo</strong> bez dodatnih troškova iznajmljivanja opreme.
          </p>

          <h4 className="home-blog-guide__h4">3. Rezervacija, depozit i ugovor</h4>
          <p>
            Za <strong>svadbu 2026.</strong> zatražite pisani dogovor ili mejl potvrdu sa datumom, trajanjem i iznosom
            avansa. <strong>Rezervacija benda</strong> sa jasnim otkaznim rokovima štiti obe strane. Ako menjate termin,
            javite odmah — dobri izvođači su često zauzeti i na <strong>muzici za proslave</strong> van sezone.
          </p>

          <h4 className="home-blog-guide__h4">4. Repertoar i „must-play“ lista</h4>
          <p>
            Dogovorite 10–15 pesama koje su obavezne (prvi ples, roditelji, tradicionalni trenuci) i šta želite da se
            izbegne. <strong>Cover bend</strong> sa širokim repertoarom lakše prilagođava se mešovitoj publici od čistog
            jednoličnog seta.
          </p>

          <h4 className="home-blog-guide__h4">5. Provera kvaliteta</h4>
          <p>
            Pogledajte snimke nastupa uživo, pročitajte utiske drugih parova i obratite pažnju na komunikaciju — pouzdan
            kontakt pre dana D znači manje nervoze. Na <strong>Pronađi Bend</strong> možete filtrirati izvođače po žanru i
            lokaciji i poslati upit bez beskonačnog lanca poruka.
          </p>

          <aside className="home-blog-guide__aside">
            <strong>Brza kontrolna lista</strong>
            <ul>
              <li>Datum, početak i kraj nastupa</li>
              <li>Opseg žanrova i posebne želje</li>
              <li>Šta je uključeno u cenu (oprema, put)</li>
              <li>Kontakt osoba na dan proslave</li>
            </ul>
          </aside>
        </div>

        <footer className="home-blog-guide__footer">
          <Link
            href="/clients"
            className="btn btn-primary home-blog-guide__cta"
            title="Pretražite bendove za svadbu i proslave u Srbiji"
          >
            Pronađi bend za svoju svadbu
            <ArrowRight size={18} aria-hidden />
          </Link>
          <p className="home-blog-guide__footnote">
            Tekst je informativan; konkretne ponude zavise od izvođača i datuma. Ažurirano za sezonu 2026.
          </p>
        </footer>
      </article>
    </motion.section>
  );
}
