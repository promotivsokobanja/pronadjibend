'use client';
import { useState } from 'react';
import { MailWarning, X } from 'lucide-react';

export default function EmailVerifyBanner({ email }) {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (dismissed) return null;

  const resend = async () => {
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Greška');
      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="evb-bar" role="alert">
        <div className="evb-content">
          <MailWarning size={18} className="evb-icon" />
          <span className="evb-text">
            {sent
              ? 'Verifikacioni email je poslat. Proverite inbox.'
              : 'Potvrdite email adresu da biste koristili sve funkcije.'}
          </span>
          {!sent && (
            <button className="evb-btn" onClick={resend} disabled={sending}>
              {sending ? 'Slanje…' : 'Pošalji ponovo'}
            </button>
          )}
          {error && <span className="evb-error">{error}</span>}
        </div>
        <button className="evb-close" onClick={() => setDismissed(true)} aria-label="Zatvori">
          <X size={16} />
        </button>
      </div>
      <style jsx>{`
        .evb-bar {
          position: fixed;
          top: var(--navbar-height, 4.75rem);
          left: 0; right: 0;
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 1.25rem;
          background: linear-gradient(90deg, #92400e, #b45309);
          color: #fef3c7;
          font-size: 0.82rem;
          font-weight: 600;
          box-shadow: 0 2px 12px rgba(0,0,0,0.3);
          animation: evbSlide 0.3s ease-out;
        }
        @keyframes evbSlide {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        .evb-content {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
          flex: 1;
        }
        .evb-icon { flex-shrink: 0; }
        .evb-text { line-height: 1.4; }
        .evb-btn {
          padding: 0.3rem 0.85rem;
          background: rgba(255,255,255,0.2);
          color: #fef3c7;
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.75rem;
          cursor: pointer;
          white-space: nowrap;
          -webkit-tap-highlight-color: transparent;
        }
        .evb-btn:hover:not(:disabled) { background: rgba(255,255,255,0.3); }
        .evb-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .evb-error { color: #fecaca; font-size: 0.75rem; }
        .evb-close {
          background: none; border: none; color: #fef3c7;
          cursor: pointer; padding: 0.25rem; opacity: 0.7;
          -webkit-tap-highlight-color: transparent;
        }
        .evb-close:hover { opacity: 1; }
        @media (max-width: 480px) {
          .evb-bar { padding: 0.5rem 0.75rem; font-size: 0.78rem; }
          .evb-text { font-size: 0.76rem; }
        }
      `}</style>
    </>
  );
}
