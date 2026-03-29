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
      className="vodic-sekcija scroll-mt-[calc(var(--navbar-height)+0.5rem)] w-full min-w-0 border-t border-slate-200/80 bg-slate-100 text-slate-800 [.theme-dark_&]:border-white/10 [.theme-dark_&]:bg-zinc-950 [.theme-dark_&]:text-slate-100"
    >
      <div className="container">
        <div className="section-title reveal">
          <div className="vodic-sekcija__eyebrow">
            <Sparkles size={16} className="vodic-sekcija__eyebrow-icon" aria-hidden />
            Za bendove
          </div>
          <h2 id="vodic-heading">
            Digitalna revolucija <span className="gradient-text">za tvoj bend</span>
          </h2>
        </div>

        <div className="vodic-sekcija__intro">
          <p>
            Savremeni nastup nije samo zvuk i svetlo — očekuje se i digitalna usluga. QR pesmarica omogućava gostima da
            pregledaju vaš repertoar i pošalju zahtev bez gužve na binu, dok vi na{' '}
            <strong className="vodic-sekcija__strong">Live Dashboard-u</strong> vidite red, prihvatate ili preskačete
            stavke.
          </p>
          <p>
            Takav tok smanjuje prekide, profesionalizuje komunikaciju sa lokalom i često doprinosi boljem iskustvu publike
            — što se u praksi odražava i na zadovoljstvo gostiju i na mogućnost većeg bakšiša zahvaljujući jasnijoj usluzi
            i manje haotičnoj atmosferi.
          </p>
        </div>

        <ul className="vodic-sekcija__grid">
          {cards.map(({ icon: Icon, title, text }) => (
            <li key={title} className="glass-card vodic-sekcija__card">
              <div className="vodic-sekcija__icon-wrap" aria-hidden>
                <Icon size={24} strokeWidth={2} />
              </div>
              <h3 className="vodic-sekcija__card-title">{title}</h3>
              <p className="vodic-sekcija__card-text">{text}</p>
            </li>
          ))}
        </ul>

        <div className="vodic-sekcija__cta-wrap">
          <Link href="/bands/profile" className="btn btn-primary vodic-sekcija__cta">
            Aktiviraj svoj PRO sistem
          </Link>
          <p className="vodic-sekcija__cta-note">
            Podesite profil benda i iskoristite alate platforme za nastupe uživo.
          </p>
          <p className="vodic-sekcija__legal-resource">
            <Link
              href="/resources/contract"
              className="vodic-sekcija__legal-link"
              title="Generator ugovora o angažovanju muzičara"
            >
              Besplatan pravni resurs
            </Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        .vodic-sekcija__eyebrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 0.85rem;
        }
        .vodic-sekcija__eyebrow-icon {
          color: #007aff;
          flex-shrink: 0;
        }
        :global(.theme-dark) .vodic-sekcija__eyebrow {
          color: #94a3b8;
        }
        .vodic-sekcija__intro {
          max-width: 42rem;
          margin: -2rem auto 0;
          padding: 0 0.25rem;
          text-align: center;
          font-size: 1.05rem;
          line-height: 1.65;
          color: #64748b;
        }
        @media (min-width: 768px) {
          .vodic-sekcija__intro {
            margin-top: -1.5rem;
          }
        }
        :global(.theme-dark) .vodic-sekcija__intro {
          color: #94a3b8;
        }
        .vodic-sekcija__intro p + p {
          margin-top: 1rem;
        }
        .vodic-sekcija__strong {
          font-weight: 600;
          color: #0f172a;
        }
        :global(.theme-dark) .vodic-sekcija__strong {
          color: #fff;
        }
        .vodic-sekcija__grid {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          margin-top: 3rem;
          width: 100%;
          max-width: 100%;
        }
        @media (min-width: 640px) {
          .vodic-sekcija__grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 1024px) {
          .vodic-sekcija__grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 2rem;
          }
        }
        .vodic-sekcija__card {
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          border-radius: 24px;
          text-align: left;
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }
        .vodic-sekcija__icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: rgba(0, 122, 255, 0.1);
          color: #007aff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }
        :global(.theme-dark) .vodic-sekcija__icon-wrap {
          background: rgba(0, 122, 255, 0.18);
        }
        .vodic-sekcija__card-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 0.5rem;
          letter-spacing: -0.02em;
        }
        :global(.theme-dark) .vodic-sekcija__card-title {
          color: #fff;
        }
        .vodic-sekcija__card-text {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.6;
          color: #64748b;
        }
        :global(.theme-dark) .vodic-sekcija__card-text {
          color: #94a3b8;
        }
        .vodic-sekcija__cta-wrap {
          margin-top: 3rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1rem;
          width: 100%;
        }
        .vodic-sekcija__cta {
          min-height: 3.25rem;
          padding-left: 2rem;
          padding-right: 2rem;
          font-size: 1rem;
          font-weight: 800;
          max-width: 100%;
        }
        @media (min-width: 480px) {
          .vodic-sekcija__cta {
            min-width: 280px;
          }
        }
        .vodic-sekcija__cta-note {
          margin: 0;
          font-size: 0.85rem;
          color: #64748b;
          max-width: 28rem;
          line-height: 1.5;
        }
        :global(.theme-dark) .vodic-sekcija__cta-note {
          color: #94a3b8;
        }
        .vodic-sekcija__legal-resource {
          margin: 0.25rem 0 0;
        }
        .vodic-sekcija__legal-link {
          font-size: 0.88rem;
          font-weight: 700;
          color: #007aff;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.2s ease;
        }
        .vodic-sekcija__legal-link:hover {
          border-bottom-color: rgba(0, 122, 255, 0.45);
        }
        :global(.theme-dark) .vodic-sekcija__legal-link {
          color: #60a5fa;
        }
      `}</style>
    </section>
  );
}
