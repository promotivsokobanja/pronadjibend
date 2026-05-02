'use client';
import { Shield, Zap, Music, Search, CalendarCheck, Handshake, Mail, Instagram, Facebook } from 'lucide-react';
import Link from 'next/link';

export default function AboutClient({ contactInfo = {} }) {
  const email = contactInfo.email || 'info@pronadjibend.rs';
  const instagramUrl = contactInfo.instagram || 'https://www.instagram.com/pronadjibend';
  const facebookUrl = contactInfo.facebook || 'https://www.facebook.com/pronadjibend';
  const instagramHandle = instagramUrl.replace(/\/+$/, '').split('/').pop() || 'pronadjibend';
  const facebookHandle = facebookUrl.replace(/\/+$/, '').split('/').pop() || 'PronadjiBend';
  const values = [
    { icon: Shield, title: 'Sigurnost i Poverenje', desc: 'Svi naši bendovi su provereni, a klijenti zaštićeni jasnim ugovorima o nastupu.' },
    { icon: Zap, title: 'Brza Rezervacija', desc: 'Od prvog klika do dogovorenog termina u manje od 24 časa.' },
    { icon: Music, title: 'Kvalitetna Muzika', desc: 'Partneri smo samo sa vrhunskim muzičarima koji garantuju atmosferu.' },
  ];

  const steps = [
    { icon: Search, num: '01', title: 'Pretraži', desc: 'Filtriraj bendove po žanru, gradu, budžetu i tipu događaja.' },
    { icon: CalendarCheck, num: '02', title: 'Rezerviši', desc: 'Pošalji upit direktno bendu — odgovor u roku od 24 sata.' },
    { icon: Handshake, num: '03', title: 'Uživaj', desc: 'Dogovori detalje nastupa i prepusti se muzici na svom događaju.' },
  ];

  return (
    <div className="about-container container">
      <div className="blob" style={{ top: '10%', right: '10%' }}></div>
      <div className="blob-2" style={{ bottom: '10%', left: '10%' }}></div>

      <section className="about-hero">
        <h1>Naša Misija: Muzika <span className="gradient-text">Bez Barijera</span></h1>
        <p className="hero-subtitle">Digitalni most između muzičara i onih koji traže živu muziku u Srbiji.</p>
      </section>

      <section className="about-showcase">
        <div className="showcase-media glass-card">
          <img
            src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80"
            alt="Bend nastupa pred publikom — živa muzika na proslavi"
            className="showcase-image"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="showcase-copy glass-card">
          <h2>Muzika koja pokreće atmosferu</h2>
          <p>
            Biramo izvođače koji umeju da podignu energiju prostora - od intimnih večeri do velikih proslava.
            Zato svaka preporuka na platformi ima jasan fokus na kvalitet izvedbe, profesionalnost i pouzdanost.
          </p>
        </div>
      </section>

      <section className="vision-section">
        <div className="glass-card vision-card">
          <h2>Ko smo mi?</h2>
          <p>
            Pronađi Bend je digitalna platforma koja jednostavno spaja klijente i proverene muzičare. 
            Pomažemo restoranima, hotelima, klubovima i organizatorima događaja da brzo pronađu bend koji 
            odgovara prostoru, publici i budžetu - bez dugog dopisivanja i neizvesnosti. Naš cilj je da 
            svaka rezervacija bude jasna, sigurna i profesionalna, a svaki nastup vrhunsko iskustvo.
          </p>
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-num">500+</span>
              <span className="stat-label">Bendova</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">1.5k+</span>
              <span className="stat-label">Nastupa</span>
            </div>
          </div>
        </div>
      </section>

      <section className="values-section">
        <div className="values-grid">
          {values.map((v, i) => (
            <div key={i} className="glass-card value-card">
              <div className="icon-box">
                <v.icon size={24} color="var(--accent-primary)" />
              </div>
              <h3>{v.title}</h3>
              <p className="text-muted">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="steps-section">
        <h2 className="steps-title">Kako funkcioniše?</h2>
        <div className="steps-grid">
          {steps.map((s, i) => (
            <div key={i} className="step-card glass-card">
              <div className="step-num">{s.num}</div>
              <div className="step-icon-box">
                <s.icon size={22} color="var(--accent-primary)" />
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about-gallery">
        <article className="gallery-card glass-card">
          <img
            src="https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=1200&q=80"
            alt="Publika na koncertu uživa u atmosferi žive muzike"
            loading="lazy"
            decoding="async"
          />
          <div className="gallery-copy">
            <h3>Publika na prvom mestu</h3>
            <p>Pratimo energiju događaja i biramo izvođače koji prirodno podižu atmosferu.</p>
          </div>
        </article>
        <article className="gallery-card glass-card">
          <img
            src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80"
            alt="Muzičar na bini tokom profesionalnog nastupa"
            loading="lazy"
            decoding="async"
          />
          <div className="gallery-copy">
            <h3>Profesionalna priprema</h3>
            <p>Od tehničkih detalja do repertoara, sve je usklađeno pre samog izlaska na scenu.</p>
          </div>
        </article>
      </section>

      <section className="cta-section">
        <div className="cta-card glass-card">
          <h2>Spreman/a za pravu atmosferu?</h2>
          <p>Pregledaj dostupne bendove i muzičare i pronađi savršenog izvođača za svoju proslavu.</p>
          <div className="cta-btns">
            <Link href="/clients" className="cta-btn-primary">Pronađi bend</Link>
            <Link href="/muzicari" className="cta-btn-secondary">Pronađi muzičara</Link>
          </div>
        </div>
      </section>

      <section className="contact-section">
        <h2 className="contact-title">Kontaktiraj nas</h2>
        <p className="contact-sub">Imaš pitanje, predlog ili partnersku ideju? Javi nam se.</p>
        <div className="contact-links">
          <a href={`mailto:${email}`} className="contact-link">
            <Mail size={18} />
            {email}
          </a>
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="contact-link">
            <Instagram size={18} />
            @{instagramHandle}
          </a>
          <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="contact-link">
            <Facebook size={18} />
            {facebookHandle}
          </a>
        </div>
      </section>

      <style jsx>{`
        .about-container {
          padding-top: 10rem;
          padding-bottom: 8rem;
          min-height: 100vh;
          position: relative;
          color: var(--text);
        }
        .about-container::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 20% 20%, rgba(205, 166, 103, 0.12), transparent 55%),
            radial-gradient(circle at 80% 10%, rgba(77, 93, 232, 0.15), transparent 45%);
          pointer-events: none;
          z-index: -1;
        }
        .about-hero { text-align: center; margin-bottom: 6rem; }
        .about-hero h1 { font-size: 4.2rem; font-weight: 800; margin-bottom: 1.25rem; letter-spacing: -2px; }
        .hero-subtitle { font-size: 1.25rem; color: var(--text-muted); max-width: 600px; margin: 0 auto; }

        .about-showcase {
          max-width: 1100px;
          margin: 0 auto 4rem;
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 1.5rem;
          align-items: stretch;
        }
        .showcase-media {
          padding: 0;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          min-height: 340px;
          background: rgba(10, 10, 22, 0.85);
        }
        .showcase-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .showcase-copy {
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 2.25rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: rgba(8, 8, 18, 0.92);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
        }
        .showcase-copy h2 {
          font-size: 1.65rem;
          margin-bottom: 0.85rem;
          letter-spacing: -0.02em;
        }
        .showcase-copy p {
          color: var(--text-muted);
          line-height: 1.8;
          font-size: 1.02rem;
        }
        
        .vision-section { max-width: 900px; margin: 0 auto 6rem; }
        .vision-card { padding: 4rem; text-align: center; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(9, 9, 20, 0.92); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45); }
        .vision-card h2 { font-size: 2.5rem; margin-bottom: 1.5rem; }
        .vision-card p { font-size: 1.15rem; line-height: 1.8; color: var(--text-muted); margin-bottom: 3rem; }
        
        .stats-row { display: flex; justify-content: center; gap: 4rem; padding-top: 3rem; border-top: 1px solid rgba(255, 255, 255, 0.08); }
        .stat-item { display: flex; flex-direction: column; align-items: center; }
        .stat-num {
          font-size: 3rem;
          font-weight: 950;
          color: var(--accent-primary);
        }
        .stat-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 800;
          letter-spacing: 2px;
        }
        
        .values-section { max-width: 1100px; margin: 0 auto; }
        .values-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
        .value-card { padding: 3rem; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(8, 8, 18, 0.9); transition: 0.3s ease; }
        .value-card:hover { border-color: rgba(255,255,255,0.2); transform: translateY(-5px); }
        .icon-box { background: rgba(205, 166, 103, 0.08); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 2rem; }
        .value-card h3 { font-size: 1.5rem; margin-bottom: 1rem; }
        .value-card p { font-size: 0.95rem; line-height: 1.6; color: var(--text-muted); }

        .about-gallery {
          max-width: 1100px;
          margin: 3rem auto 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .gallery-card {
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0;
          background: rgba(9, 9, 20, 0.92);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .gallery-card img {
          width: 100%;
          height: 220px;
          object-fit: cover;
          display: block;
        }
        .gallery-copy {
          padding: 1.2rem 1.25rem 1.35rem;
        }
        .gallery-copy h3 {
          font-size: 1.05rem;
          margin-bottom: 0.35rem;
        }
        .gallery-copy p {
          color: var(--text-muted);
          font-size: 0.9rem;
          line-height: 1.6;
        }

        /* Kako funkcioniše */
        .steps-section { max-width: 1100px; margin: 6rem auto 0; }
        .steps-title { font-size: 2rem; font-weight: 800; text-align: center; margin-bottom: 2.5rem; letter-spacing: -0.03em; }
        .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .step-card {
          padding: 2.5rem 2rem;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(8,8,18,0.9);
          position: relative;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .step-card:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.18); }
        .step-num {
          font-size: 3rem;
          font-weight: 900;
          color: rgba(205,166,103,0.18);
          line-height: 1;
          margin-bottom: 1rem;
          letter-spacing: -2px;
        }
        .step-icon-box {
          width: 44px; height: 44px; border-radius: 12px;
          background: rgba(205,166,103,0.08);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 1.25rem;
        }
        .step-card h3 { font-size: 1.25rem; margin-bottom: 0.5rem; }
        .step-card p { font-size: 0.93rem; color: var(--text-muted); line-height: 1.65; }

        /* CTA */
        .cta-section { max-width: 860px; margin: 6rem auto 0; }
        .cta-card {
          padding: 4rem 3rem;
          text-align: center;
          border: 1px solid rgba(205,166,103,0.2);
          background: linear-gradient(135deg, rgba(205,166,103,0.06), rgba(77,93,232,0.08));
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        .cta-card h2 { font-size: 2.2rem; font-weight: 800; margin-bottom: 1rem; letter-spacing: -0.03em; }
        .cta-card p { font-size: 1.05rem; color: var(--text-muted); margin-bottom: 2.5rem; max-width: 500px; margin-left: auto; margin-right: auto; }
        .cta-btns { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
        .cta-btn-primary {
          padding: 0.85rem 2.25rem;
          background: var(--accent-primary);
          color: #000;
          font-weight: 700;
          border-radius: 100px;
          text-decoration: none;
          font-size: 0.95rem;
          transition: opacity 0.2s;
        }
        .cta-btn-primary:hover { opacity: 0.85; }
        .cta-btn-secondary {
          padding: 0.85rem 2.25rem;
          background: rgba(255,255,255,0.06);
          color: var(--text);
          font-weight: 600;
          border-radius: 100px;
          text-decoration: none;
          font-size: 0.95rem;
          border: 1px solid rgba(255,255,255,0.15);
          transition: background 0.2s;
        }
        .cta-btn-secondary:hover { background: rgba(255,255,255,0.1); }

        /* Kontakt */
        .contact-section { max-width: 700px; margin: 5rem auto 0; text-align: center; }
        .contact-title { font-size: 1.75rem; font-weight: 800; margin-bottom: 0.75rem; }
        .contact-sub { color: var(--text-muted); margin-bottom: 2rem; font-size: 1rem; }
        .contact-links { display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap; }
        .contact-link {
          display: flex; align-items: center; gap: 0.5rem;
          color: var(--text-muted);
          text-decoration: none;
          font-size: 0.95rem;
          padding: 0.6rem 1.25rem;
          border-radius: 100px;
          border: 1px solid rgba(255,255,255,0.1);
          transition: color 0.2s, border-color 0.2s;
        }
        .contact-link:hover { color: var(--accent-primary); border-color: var(--accent-primary); }

        @media (max-width: 968px) {
          .about-hero h1 { font-size: 2.5rem; }
          .about-showcase { grid-template-columns: 1fr; }
          .showcase-media { min-height: 260px; }
          .showcase-copy { padding: 1.5rem; }
          .vision-card { padding: 2rem; }
          .values-grid { grid-template-columns: 1fr; }
          .about-gallery { grid-template-columns: 1fr; }
          .stats-row { gap: 2rem; }
          .steps-grid { grid-template-columns: 1fr; }
          .cta-card { padding: 2.5rem 1.5rem; }
          .cta-card h2 { font-size: 1.6rem; }
          .contact-links { flex-direction: column; align-items: center; }
        }
      `}</style>
    </div>
  );
}
