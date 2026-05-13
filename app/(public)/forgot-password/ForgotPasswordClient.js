'use client';
import { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Greška');
      setStatus(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fp-container">
      <div className="fp-box">
        <h2>Zaboravljena lozinka</h2>
        <p className="fp-sub">Unesite email adresu i poslaćemo vam link za reset lozinke.</p>

        {status && <div className="fp-success">{status}</div>}
        {error && <div className="fp-error">{error}</div>}

        {!status && (
          <form onSubmit={handleSubmit}>
            <div className="fp-input-group">
              <Mail size={18} />
              <input
                type="email"
                placeholder="Email adresa"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="fp-btn" disabled={loading}>
              {loading ? 'Slanje...' : 'Pošalji link za reset'}
            </button>
          </form>
        )}

        <Link href="/login" className="fp-back">
          <ArrowLeft size={16} /> Nazad na prijavu
        </Link>
      </div>

      <style jsx>{`
        .fp-container {
          min-height: 100vh; min-height: 100dvh;
          display: flex; align-items: center; justify-content: center;
          padding: calc(var(--navbar-height, 4.75rem) + 1.5rem) 1rem 2rem;
          padding-bottom: env(safe-area-inset-bottom, 1rem);
          background: #030308;
        }
        .fp-box {
          width: 100%; max-width: 440px;
          padding: 2.5rem 2rem;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          background: rgba(8,8,18,0.95);
          box-shadow: 0 40px 80px rgba(0,0,0,0.5);
        }
        h2 { color: #f8fafc; font-size: 1.8rem; font-weight: 900; margin-bottom: 0.5rem; text-align: center; }
        .fp-sub { color: #94a3b8; font-size: 0.9rem; text-align: center; margin-bottom: 1.5rem; line-height: 1.5; }
        .fp-input-group {
          display: flex; align-items: center; gap: 0.85rem;
          padding: 0.85rem 1.1rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; margin-bottom: 1rem;
          color: #94a3b8;
        }
        .fp-input-group:focus-within { border-color: #cda667; box-shadow: 0 0 0 1px rgba(205,166,103,0.45); }
        .fp-input-group input {
          background: none; border: none; color: #f8fafc; width: 100%;
          outline: none; font-size: 16px; font-weight: 500;
          -webkit-appearance: none; appearance: none;
        }
        .fp-input-group input:-webkit-autofill,
        .fp-input-group input:-webkit-autofill:hover,
        .fp-input-group input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px rgba(8,8,18,1) inset !important;
          -webkit-text-fill-color: #f8fafc !important;
        }
        .fp-btn {
          width: 100%; padding: 0.85rem;
          background: linear-gradient(120deg, #4d5de8, #cda667);
          color: #050505; border: none; border-radius: 999px;
          font-weight: 800; font-size: 0.9rem; cursor: pointer;
          letter-spacing: 0.02em;
          -webkit-tap-highlight-color: transparent;
        }
        .fp-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
        .fp-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .fp-success {
          background: rgba(16,185,129,0.15); color: #bbf7d0;
          padding: 0.85rem 1rem; border-radius: 12px; font-size: 0.85rem;
          font-weight: 600; margin-bottom: 1rem;
          border: 1px solid rgba(16,185,129,0.3); text-align: center; line-height: 1.5;
        }
        .fp-error {
          background: rgba(239,68,68,0.15); color: #fecaca;
          padding: 0.85rem 1rem; border-radius: 12px; font-size: 0.85rem;
          font-weight: 600; margin-bottom: 1rem;
          border: 1px solid rgba(239,68,68,0.4);
        }
        .fp-back {
          display: flex; align-items: center; justify-content: center; gap: 0.4rem;
          margin-top: 1.5rem; color: #94a3b8; font-size: 0.85rem; font-weight: 600;
          text-decoration: none;
          -webkit-tap-highlight-color: transparent;
        }
        .fp-back:hover { color: #cda667; }
        @media (max-width: 640px) {
          .fp-container { padding: calc(var(--navbar-height, 4rem) + 1rem) 0.75rem 1.5rem; }
          .fp-box { padding: 1.8rem 1.25rem; border-radius: 22px; }
          h2 { font-size: 1.5rem; }
          .fp-sub { font-size: 0.85rem; }
        }
        @media (max-width: 480px) {
          .fp-box { padding: 1.5rem 1rem; }
          h2 { font-size: 1.35rem; }
        }
      `}</style>
    </div>
  );
}
