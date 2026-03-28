'use client';
import { ChevronDown, Mail, Phone, MapPin } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { faqData } from '@/lib/faqData';

export default function FAQClient() {
  const [openIndex, setOpenIndex] = useState(null);
  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

  return (
    <div className="faq-container container">
      <section className="faq-hero">
        <h1>Česta <span className="gradient-text">Pitanja</span></h1>
        <p className="hero-subtitle">Sve što trebate znati o Pronađi Bend platformi.</p>
      </section>

      <section className="faq-list">
        {faqData.map((faq, i) => (
          <div key={i} className={`faq-item ${openIndex === i ? 'open' : ''}`} onClick={() => toggle(i)}>
            <div className="faq-question">
              <h2>{faq.q}</h2>
              <ChevronDown size={20} className={`chevron ${openIndex === i ? 'rotated' : ''}`} />
            </div>
            <div className={`faq-answer ${openIndex === i ? 'visible' : ''}`}>
              <p>{faq.a}</p>
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
          <Link href="/clients?pretraga=1" className="btn btn-primary cta-btn">Pretraži Bendove</Link>
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
        .faq-question h2 {
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
          .faq-question h2 { font-size: 0.95rem; }
          .faq-answer { padding-left: 1.5rem; padding-right: 1.5rem; }
          .faq-answer.visible { padding: 0 1.5rem 1.25rem; }
          .cta-card { padding: 2.5rem 1.5rem; }
        }
      `}</style>
    </div>
  );
}
