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
          <Link href="/clients" className="btn btn-primary cta-btn">Pretraži Bendove</Link>
        </div>
      </section>

      <style jsx>{`
        .faq-container { padding-top: 10rem; padding-bottom: 8rem; min-height: 100vh; overflow-x: hidden; }
        .faq-hero { text-align: center; margin-bottom: 5rem; }
        .faq-hero h1 { font-size: 4rem; font-weight: 800; margin-bottom: 1rem; letter-spacing: -2px; color: #f8fafc; }
        .hero-subtitle { font-size: 1.2rem; color: #94a3b8; }

        .faq-list { max-width: 800px; margin: 0 auto 6rem; }

        .faq-item {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          margin-bottom: 1rem;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.03);
        }
        .faq-item:hover { border-color: rgba(139, 92, 246, 0.4); box-shadow: 0 4px 20px rgba(139, 92, 246, 0.1); }
        .faq-item.open { border-color: rgba(139, 92, 246, 0.5); background: rgba(139, 92, 246, 0.06); }

        .faq-question {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
        }
        .faq-question h2 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #f1f5f9;
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
          color: #cbd5e1;
          margin: 0;
        }

        .faq-cta { max-width: 700px; margin: 0 auto; text-align: center; }
        .cta-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 4rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }
        .cta-card h2 { font-size: 2rem; font-weight: 800; color: #f8fafc; margin-bottom: 0.75rem; }
        .cta-card p { color: #94a3b8; font-size: 1.05rem; margin-bottom: 2rem; }

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
          color: #cbd5e1;
          font-size: 0.95rem;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s;
        }
        .cta-contacts a:hover { color: #a78bfa; }

        .cta-btn { border-radius: 100px; padding: 1rem 3rem; font-size: 1rem; }

        @media (max-width: 968px) {
          .faq-hero h1 { font-size: 2.5rem; }
          .faq-question { padding: 1.25rem 1.5rem; }
          .faq-question h2 { font-size: 0.95rem; }
          .faq-answer { padding-left: 1.5rem; padding-right: 1.5rem; }
          .faq-answer.visible { padding: 0 1.5rem 1.25rem; }
          .cta-card { padding: 2.5rem 1.5rem; }
        }
        @media (max-width: 480px) {
          .faq-container { padding-top: 7rem; }
          .faq-hero { margin-bottom: 3rem; }
          .faq-hero h1 { font-size: 1.85rem; }
          .hero-subtitle { font-size: 1rem; }
          .faq-question { padding: 1rem 1.1rem; }
          .faq-question h2 { font-size: 0.9rem; }
          .faq-answer.visible { padding: 0 1.1rem 1rem; }
          .cta-card { padding: 2rem 1.15rem; border-radius: 18px; }
          .cta-card h2 { font-size: 1.5rem; }
          .cta-btn { padding: 0.85rem 2rem; }
        }
      `}</style>
    </div>
  );
}
