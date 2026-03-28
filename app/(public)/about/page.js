'use client';
import { Shield, Zap, Music } from 'lucide-react';

export default function AboutPage() {
  const values = [
    { icon: Shield, title: 'Sigurnost i Poverenje', desc: 'Svi naši bendovi su provereni, a klijenti zaštićeni jasnim ugovorima o nastupu.' },
    { icon: Zap, title: 'Brza Rezervacija', desc: 'Od prvog klika do dogovorenog termina u manje od 24 časa.' },
    { icon: Music, title: 'Kvalitetna Muzika', desc: 'Partneri smo samo sa vrhunskim muzičarima koji garantuju atmosferu.' },
  ];

  return (
    <div className="about-container container">
      <div className="blob" style={{ top: '10%', right: '10%' }}></div>
      <div className="blob-2" style={{ bottom: '10%', left: '10%' }}></div>

      <section className="about-hero">
        <h1>Naša Misija: Muzika <span className="gradient-text">Bez Barijera</span></h1>
        <p className="hero-subtitle">Digitalni most između umetnika i najboljih lokala u regionu.</p>
      </section>

      <section className="about-showcase">
        <div className="showcase-media glass-card">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/2/23/Madness_at_Main_stage%2C_Exit_festival.jpg"
            alt="Nastup na Exit festivalu u Novom Sadu"
            className="showcase-image"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="showcase-copy glass-card">
          <h3>Muzika koja pokreće atmosferu</h3>
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

      <section className="about-gallery">
        <article className="gallery-card glass-card">
          <img
            src="https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=1200&q=80"
            alt="Urbana publika na koncertu"
            loading="lazy"
            decoding="async"
          />
          <div className="gallery-copy">
            <h4>Publika na prvom mestu</h4>
            <p>Pratimo energiju događaja i biramo izvođače koji prirodno podižu atmosferu.</p>
          </div>
        </article>
        <article className="gallery-card glass-card">
          <img
            src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80"
            alt="Bend na urbanom nastupu"
            loading="lazy"
            decoding="async"
          />
          <div className="gallery-copy">
            <h4>Profesionalna priprema</h4>
            <p>Od tehničkih detalja do repertoara, sve je usklađeno pre samog izlaska na scenu.</p>
          </div>
        </article>
      </section>

      <style jsx>{`
        .about-container { padding-top: 10rem; padding-bottom: 8rem; min-height: 100vh; }
        .about-hero { text-align: center; margin-bottom: 6rem; }
        .about-hero h1 { font-size: 4.5rem; font-weight: 800; margin-bottom: 1.5rem; letter-spacing: -2px; }
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
          border: 1px solid var(--border);
          min-height: 340px;
        }
        .showcase-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .showcase-copy {
          border: 1px solid var(--border);
          padding: 2.25rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .showcase-copy h3 {
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
        .vision-card { padding: 4rem; text-align: center; border: 1px solid var(--border); }
        .vision-card h2 { font-size: 2.5rem; margin-bottom: 1.5rem; }
        .vision-card p { font-size: 1.15rem; line-height: 1.8; color: var(--text-muted); margin-bottom: 3rem; }
        
        .stats-row { display: flex; justify-content: center; gap: 4rem; padding-top: 3rem; border-top: 1px solid var(--border); }
        .stat-item { display: flex; flex-direction: column; align-items: center; }
        .stat-num {
          font-size: 3rem;
          font-weight: 950;
          color: #0f172a;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.7);
        }
        .stat-label {
          font-size: 0.75rem;
          color: #475569;
          text-transform: uppercase;
          font-weight: 800;
          letter-spacing: 2px;
        }
        
        .values-section { max-width: 1100px; margin: 0 auto; }
        .values-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
        .value-card { padding: 3rem; border: 1px solid var(--border); transition: 0.3s ease; }
        .value-card:hover { border-color: rgba(255,255,255,0.2); transform: translateY(-5px); }
        .icon-box { background: rgba(16, 185, 129, 0.1); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 2rem; }
        .value-card h3 { font-size: 1.5rem; margin-bottom: 1rem; }
        .value-card p { font-size: 0.95rem; line-height: 1.6; }

        .about-gallery {
          max-width: 1100px;
          margin: 3rem auto 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .gallery-card {
          overflow: hidden;
          border: 1px solid var(--border);
          padding: 0;
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
        .gallery-copy h4 {
          font-size: 1.05rem;
          margin-bottom: 0.35rem;
        }
        .gallery-copy p {
          color: var(--text-muted);
          font-size: 0.9rem;
          line-height: 1.6;
        }

        @media (max-width: 968px) {
          .about-hero h1 { font-size: 2.5rem; }
          .about-showcase { grid-template-columns: 1fr; }
          .showcase-media { min-height: 260px; }
          .showcase-copy { padding: 1.5rem; }
          .vision-card { padding: 2rem; }
          .values-grid { grid-template-columns: 1fr; }
          .about-gallery { grid-template-columns: 1fr; }
          .stats-row { gap: 2rem; }
        }
      `}</style>
    </div>
  );
}
