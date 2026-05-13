'use client';
import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordClient() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token') || '';
    setToken(t);
    if (!t) setError('Nevažeći link za reset lozinke.');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const pwd = password.trim();
    const cfm = confirm.trim();
    if (pwd.length < 6) { setError('Lozinka mora imati najmanje 6 karaktera.'); return; }
    if (pwd !== cfm) { setError('Lozinke se ne poklapaju.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pwd }),
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
    <div className="rp-container">
      <div className="rp-box">
        <h2>Nova lozinka</h2>

        {status && (
          <>
            <div className="rp-success">{status}</div>
            <Link href="/login" className="rp-login-btn">Prijavi se</Link>
          </>
        )}
        {error && <div className="rp-error">{error}</div>}

        {!status && token && (
          <form onSubmit={handleSubmit}>
            <div className="rp-input-group">
              <Lock size={18} />
              <input
                type={show ? 'text' : 'password'}
                placeholder="Nova lozinka (min 6 karaktera)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="rp-eye" onClick={() => setShow(!show)}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="rp-input-group">
              <Lock size={18} />
              <input
                type={show ? 'text' : 'password'}
                placeholder="Potvrdi lozinku"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="rp-btn" disabled={loading}>
              {loading ? 'Čuvanje...' : 'Postavi novu lozinku'}
            </button>
          </form>
        )}

        <Link href="/login" className="rp-back">
          <ArrowLeft size={16} /> Nazad na prijavu
        </Link>
      </div>

      <style jsx>{`
        .rp-container {
          min-height: 100vh; min-height: 100dvh;
          display: flex; align-items: center; justify-content: center;
          padding: calc(var(--navbar-height, 4.75rem) + 1.5rem) 1rem 2rem;
          padding-bottom: env(safe-area-inset-bottom, 1rem);
          background: #030308;
        }
        .rp-box {
          width: 100%; max-width: 440px;
          padding: 2.5rem 2rem;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          background: rgba(8,8,18,0.95);
          box-shadow: 0 40px 80px rgba(0,0,0,0.5);
        }
        h2 { color: #f8fafc; font-size: 1.8rem; font-weight: 900; margin-bottom: 1.5rem; text-align: center; }
        .rp-input-group {
          display: flex; align-items: center; gap: 0.85rem;
          padding: 0.85rem 1.1rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; margin-bottom: 1rem;
          color: #94a3b8;
        }
        .rp-input-group:focus-within { border-color: #cda667; box-shadow: 0 0 0 1px rgba(205,166,103,0.45); }
        .rp-input-group input {
          background: none; border: none; color: #f8fafc; width: 100%;
          outline: none; font-size: 16px; font-weight: 500;
          -webkit-appearance: none; appearance: none;
        }
        .rp-input-group input:-webkit-autofill,
        .rp-input-group input:-webkit-autofill:hover,
        .rp-input-group input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px rgba(8,8,18,1) inset !important;
          -webkit-text-fill-color: #f8fafc !important;
        }
        .rp-eye {
          border: none; background: transparent; padding: 0; cursor: pointer;
          color: #64748b; display: inline-flex;
        }
        .rp-eye:hover { color: #f1f5f9; }
        .rp-btn {
          width: 100%; padding: 0.85rem;
          background: linear-gradient(120deg, #4d5de8, #cda667);
          color: #050505; border: none; border-radius: 999px;
          font-weight: 800; font-size: 0.9rem; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .rp-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
        .rp-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .rp-success {
          background: rgba(16,185,129,0.15); color: #bbf7d0;
          padding: 0.85rem 1rem; border-radius: 12px; font-size: 0.85rem;
          font-weight: 600; margin-bottom: 1rem;
          border: 1px solid rgba(16,185,129,0.3); text-align: center; line-height: 1.5;
        }
        .rp-error {
          background: rgba(239,68,68,0.15); color: #fecaca;
          padding: 0.85rem 1rem; border-radius: 12px; font-size: 0.85rem;
          font-weight: 600; margin-bottom: 1rem;
          border: 1px solid rgba(239,68,68,0.4);
        }
        .rp-login-btn {
          display: block; text-align: center; width: 100%; padding: 0.85rem;
          background: linear-gradient(120deg, #4d5de8, #cda667);
          color: #050505; border-radius: 999px;
          font-weight: 800; font-size: 0.9rem; text-decoration: none;
        }
        .rp-back {
          display: flex; align-items: center; justify-content: center; gap: 0.4rem;
          margin-top: 1.5rem; color: #94a3b8; font-size: 0.85rem; font-weight: 600;
          text-decoration: none;
        }
        .rp-back:hover { color: #cda667; }
        .rp-back, .rp-login-btn { -webkit-tap-highlight-color: transparent; }
        @media (max-width: 640px) {
          .rp-container { padding: calc(var(--navbar-height, 4rem) + 1rem) 0.75rem 1.5rem; }
          .rp-box { padding: 1.8rem 1.25rem; border-radius: 22px; }
          h2 { font-size: 1.5rem; }
        }
        @media (max-width: 480px) {
          .rp-box { padding: 1.5rem 1rem; }
          h2 { font-size: 1.35rem; }
        }
      `}</style>
    </div>
  );
}
