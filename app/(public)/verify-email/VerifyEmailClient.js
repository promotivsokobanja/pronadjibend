'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function VerifyEmailClient() {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus('error');
      setMessage('Nevažeći link za verifikaciju.');
      return;
    }
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setStatus('error');
          setMessage(data.error);
        } else {
          setStatus('success');
          setMessage(data.message);
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Greška pri verifikaciji.');
      });
  }, []);

  return (
    <div className="ve-container">
      <div className="ve-box">
        {status === 'loading' && <p className="ve-loading">Verifikacija u toku...</p>}
        {status === 'success' && (
          <>
            <div className="ve-icon">✓</div>
            <h2>Email potvrđen!</h2>
            <p className="ve-msg">{message}</p>
            <Link href="/login" className="ve-btn">Prijavi se</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="ve-icon ve-icon-err">✕</div>
            <h2>Greška</h2>
            <p className="ve-msg">{message}</p>
            <Link href="/login" className="ve-back">Nazad na prijavu</Link>
          </>
        )}
      </div>

      <style jsx>{`
        .ve-container {
          min-height: 100vh; min-height: 100dvh;
          display: flex; align-items: center; justify-content: center;
          padding: 2rem 1rem; background: #030308;
        }
        .ve-box {
          width: 100%; max-width: 420px;
          padding: 2.5rem 2rem; text-align: center;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          background: rgba(8,8,18,0.95);
          box-shadow: 0 40px 80px rgba(0,0,0,0.5);
        }
        .ve-loading { color: #94a3b8; font-size: 1rem; }
        .ve-icon {
          width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 1rem;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.8rem; font-weight: 900;
          background: rgba(16,185,129,0.15); color: #4ade80;
          border: 2px solid rgba(16,185,129,0.3);
        }
        .ve-icon-err { background: rgba(239,68,68,0.15); color: #f87171; border-color: rgba(239,68,68,0.3); }
        h2 { color: #f8fafc; font-size: 1.5rem; font-weight: 900; margin-bottom: 0.5rem; }
        .ve-msg { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; line-height: 1.5; }
        .ve-btn {
          display: inline-block; padding: 0.85rem 2rem;
          background: linear-gradient(120deg, #4d5de8, #cda667);
          color: #050505; border-radius: 999px;
          font-weight: 800; font-size: 0.9rem; text-decoration: none;
        }
        .ve-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
        .ve-back { color: #94a3b8; font-size: 0.85rem; text-decoration: none; }
        .ve-back:hover { color: #cda667; }
      `}</style>
    </div>
  );
}
