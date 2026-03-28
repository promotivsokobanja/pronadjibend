'use client';
import { ChevronDown, Mail, Phone, MapPin } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: 'Kako mogu da pronađem bend za moj event?',
      answer: 'Na stranici "Pretraži Bendove" možete filtrirati muzičare po žanru (Pop/Rock, Zabavna, Narodna, Jazz, Acoustic), lokaciji i oceni. Svaki bend ima detaljan profil sa opisom, repertoarom, cenovnikom i ocenama prethodnih klijenata.'
    },
    {
      question: 'Kako funkcioniše proces rezervacije nastupa?',
      answer: 'Kada pronađete željeni bend, kliknite na dugme "Zakaži" na njihovom profilu. Popunite formular sa datumom, tipom događaja (svadba, korporativni event, restoran) i dodatnim napomenama. Bend će primiti vaš upit i kontaktirati vas putem emaila u roku od 24 časa.'
    },
    {
      question: 'Šta je Live Request sistem?',
      answer: 'Live Request je naša inovativna funkcija koja omogućava gostima u restoranu ili na eventu da u realnom vremenu šalju zahteve za pesme bendu koji nastupa. Gosti skeniraju QR kod, biraju pesmu iz repertoara benda i šalju zahtev direktno na dashboard muzičara.'
    },
    {
      question: 'Da li je registracija besplatna?',
      answer: 'Da! Basic paket je potpuno besplatan i uključuje pristup celokupnoj bazi bendova i mogućnost slanja direktnih upita za rezervaciju. Za napredne funkcije kao što su Live Request sistem, prioritetni booking i promocija na platformi, dostupan je Premium Venue paket po ceni od 49€ mesečno.'
    },
    {
      question: 'Kako se registrujem kao muzičar/bend?',
      answer: 'Kliknite na "Portal za Muzičare" u meniju i kreirajte svoj profil. Možete dodati opis benda, žanr, lokaciju, cenovnik, fotografije i kompletan repertoar pesama. Vaš profil će biti vidljiv svim klijentima na platformi nakon verifikacije.'
    },
    {
      question: 'Kako funkcioniše upravljanje repertoarom?',
      answer: 'Kroz portal za muzičare možete dodavati, uređivati i organizovati pesme u svom repertoaru. Svaka pesma može imati naziv, izvođača, žanr i napomene. Repertoar je vidljiv klijentima na vašem profilu i koristi se za Live Request funkciju tokom nastupa.'
    },
    {
      question: 'Koliko košta nastup benda?',
      answer: 'Cene variraju u zavisnosti od benda, tipa događaja, trajanja nastupa i lokacije. Svaki bend na platformi ima prikazan okvirni cenovnik (npr. 300€ - 1200€). Tačnu cenu dogovarate direktno sa bendom nakon slanja upita za rezervaciju.'
    },
    {
      question: 'Da li bendovi imaju sopstveno ozvučenje?',
      answer: 'Mnogi bendovi na platformi poseduju sopstveno ozvučenje i rasvetu, što je označeno "Rider OK" bedžom na njihovom profilu. Ako vam je potrebno ozvučenje, možete filtrirati bendove po ovom kriterijumu pri pretrazi.'
    },
    {
      question: 'Kako mogu da kontaktiram podršku?',
      answer: 'Možete nas kontaktirati putem emaila na office@pronadjibend.rs ili telefonom na +381 64 339 2339. Naš tim za podršku je dostupan radnim danima od 9:00 do 17:00. Takođe nas možete posetiti u Sokobanji.'
    },
    {
      question: 'Da li platforma pokriva celu Srbiju?',
      answer: 'Da! Pronađi Bend pokriva teritoriju cele Srbije. Bendovi na platformi dolaze iz različitih gradova — Beograda, Novog Sada, Niša, Kragujevca, Sokobanje i mnogih drugih. Možete filtrirati muzičare po lokaciji da pronađete one koji su najbliži vašem mestu održavanja eventa.'
    }
  ];

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

  return (
    <div className="faq-container container">
      <section className="faq-hero">
        <h1>Česta <span className="gradient-text">Pitanja</span></h1>
        <p className="hero-subtitle">Sve što trebate znati o Pronađi Bend platformi.</p>
      </section>

      <section className="faq-list">
        {faqs.map((faq, i) => (
          <div key={i} className={`faq-item ${openIndex === i ? 'open' : ''}`} onClick={() => toggle(i)}>
            <div className="faq-question">
              <h3>{faq.question}</h3>
              <ChevronDown size={20} className={`chevron ${openIndex === i ? 'rotated' : ''}`} />
            </div>
            <div className={`faq-answer ${openIndex === i ? 'visible' : ''}`}>
              <p>{faq.answer}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="faq-cta">
        <div className="cta-card">
          <h2>Niste pronašli odgovor?</h2>
          <p>Kontaktirajte nas direktno — rado ćemo vam pomoći.</p>
          <div className="cta-contacts">
            <a href="mailto:office@pronadjibend.rs"><Mail size={18} /> office@pronadjibend.rs</a>
            <a href="tel:+381643392339"><Phone size={18} /> +381 64 339 2339</a>
            <span><MapPin size={18} /> Sokobanja, Srbija</span>
          </div>
          <Link href="/clients" className="btn btn-primary cta-btn">Pretraži Bendove</Link>
        </div>
      </section>

      <style jsx>{`
        .faq-container { padding-top: 10rem; padding-bottom: 8rem; min-height: 100vh; }
        .faq-hero { text-align: center; margin-bottom: 5rem; }
        .faq-hero h1 { font-size: 4rem; font-weight: 800; margin-bottom: 1rem; letter-spacing: -2px; color: #0f172a; }
        .hero-subtitle { font-size: 1.2rem; color: #64748b; }

        .faq-list { max-width: 800px; margin: 0 auto 6rem; }

        .faq-item {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          margin-bottom: 1rem;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #ffffff;
        }
        .faq-item:hover { border-color: #a855f7; box-shadow: 0 4px 20px rgba(168, 85, 247, 0.08); }
        .faq-item.open { border-color: #a855f7; background: #faf5ff; }

        .faq-question {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
        }
        .faq-question h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          flex: 1;
          padding-right: 1rem;
        }

        .chevron { color: #94a3b8; transition: transform 0.3s ease; flex-shrink: 0; }
        .chevron.rotated { transform: rotate(180deg); color: #a855f7; }

        .faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.4s ease, padding 0.3s ease;
          padding: 0 2rem;
        }
        .faq-answer.visible {
          max-height: 300px;
          padding: 0 2rem 1.5rem;
        }
        .faq-answer p {
          font-size: 0.95rem;
          line-height: 1.7;
          color: #475569;
          margin: 0;
        }

        .faq-cta { max-width: 700px; margin: 0 auto; text-align: center; }
        .cta-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 4rem;
        }
        .cta-card h2 { font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 0.75rem; }
        .cta-card p { color: #64748b; font-size: 1.05rem; margin-bottom: 2rem; }

        .cta-contacts {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: center;
          margin-bottom: 2.5rem;
        }
        .cta-contacts a, .cta-contacts span {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #475569;
          font-size: 0.95rem;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s;
        }
        .cta-contacts a:hover { color: #a855f7; }

        .cta-btn { border-radius: 100px; padding: 1rem 3rem; font-size: 1rem; }

        @media (max-width: 968px) {
          .faq-hero h1 { font-size: 2.5rem; }
          .faq-question { padding: 1.25rem 1.5rem; }
          .faq-question h3 { font-size: 0.95rem; }
          .faq-answer { padding-left: 1.5rem; padding-right: 1.5rem; }
          .faq-answer.visible { padding: 0 1.5rem 1.25rem; }
          .cta-card { padding: 2.5rem 1.5rem; }
        }
      `}</style>
    </div>
  );
}
