'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const COOKIE_KEY = 'pb_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(COOKIE_KEY)) setVisible(true);
    } catch { /* SSR or private browsing */ }
  }, []);

  const accept = () => {
    try { localStorage.setItem(COOKIE_KEY, '1'); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div className="cc-bar" role="alert">
        <p className="cc-text">
          Koristimo kolačiće za rad sajta i poboljšanje iskustva.{' '}
          <Link href="/privatnost" className="cc-link">Politika privatnosti</Link>
        </p>
        <button className="cc-btn" onClick={accept}>Prihvatam</button>
      </div>
      <style jsx>{`
        .cc-bar {
          position: fixed; bottom: 0; left: 0; right: 0;
          z-index: 9999;
          display: flex; align-items: center; justify-content: center; gap: 1rem;
          flex-wrap: wrap;
          padding: 0.9rem 1.5rem;
          background: rgba(10,10,18,0.97);
          border-top: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          padding-bottom: max(0.9rem, env(safe-area-inset-bottom));
          animation: ccSlideUp 0.4s ease-out;
        }
        @keyframes ccSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        .cc-text {
          color: #94a3b8; font-size: 0.82rem; font-weight: 500;
          margin: 0; line-height: 1.5; text-align: center;
        }
        .cc-link { color: #cda667; text-decoration: underline; }
        .cc-btn {
          padding: 0.5rem 1.5rem;
          background: linear-gradient(120deg, #4d5de8, #cda667);
          color: #050505; border: none; border-radius: 999px;
          font-weight: 800; font-size: 0.78rem; cursor: pointer;
          white-space: nowrap;
          -webkit-tap-highlight-color: transparent;
        }
        .cc-btn:hover { filter: brightness(1.08); }
        @media (max-width: 768px) {
          .cc-bar {
            bottom: var(--bottom-nav-h, 60px);
            padding-left: max(1rem, env(safe-area-inset-left));
            padding-right: max(1rem, env(safe-area-inset-right));
          }
        }
        @media (max-width: 480px) {
          .cc-bar { flex-direction: column; gap: 0.65rem; padding: 0.75rem 1rem; }
          .cc-btn { width: 100%; }
        }
      `}</style>
    </>
  );
}
