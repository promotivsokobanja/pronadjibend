'use client';
import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, User, Mail, Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProfilClient() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdStatus, setPwdStatus] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data?.user) setUser(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdStatus('');
    if (newPwd.length < 6) { setPwdError('Nova lozinka mora imati najmanje 6 karaktera.'); return; }
    if (newPwd !== confirmPwd) { setPwdError('Lozinke se ne poklapaju.'); return; }
    setPwdLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Greška');
      setPwdStatus(data.message);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pr-container">
        <div className="pr-box"><p style={{ color: '#94a3b8', textAlign: 'center' }}>Učitavanje...</p></div>
        <Style />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pr-container">
        <div className="pr-box">
          <h2>Niste prijavljeni</h2>
          <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '1.5rem' }}>Prijavite se da biste pristupili profilu.</p>
          <Link href="/login" className="pr-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Prijavi se</Link>
        </div>
        <Style />
      </div>
    );
  }

  const roleLabel = { ADMIN: 'Administrator', BAND: 'Bend', MUSICIAN: 'Muzičar', CLIENT: 'Klijent' };

  return (
    <div className="pr-container">
      <div className="pr-box">
        <h2>Moj profil</h2>

        <div className="pr-info-card">
          <div className="pr-info-row"><Mail size={16} /> <span>{user.email}</span></div>
          <div className="pr-info-row"><Shield size={16} /> <span>{roleLabel[user.role] || user.role}</span></div>
          {user.plan && user.plan !== 'FREE' && (
            <div className="pr-info-row"><User size={16} /> <span>Plan: {user.plan}</span></div>
          )}
        </div>

        <div className="pr-section">
          <h3>Promena lozinke</h3>
          {pwdStatus && <div className="pr-success">{pwdStatus}</div>}
          {pwdError && <div className="pr-error">{pwdError}</div>}
          <form onSubmit={handleChangePassword}>
            <div className="pr-input-group">
              <Lock size={18} />
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Trenutna lozinka"
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                required
              />
            </div>
            <div className="pr-input-group">
              <Lock size={18} />
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Nova lozinka (min 6 karaktera)"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                required
              />
              <button type="button" className="pr-eye" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="pr-input-group">
              <Lock size={18} />
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Potvrdi novu lozinku"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="pr-btn" disabled={pwdLoading}>
              {pwdLoading ? 'Čuvanje...' : 'Promeni lozinku'}
            </button>
          </form>
        </div>

        <Link href="/" className="pr-back"><ArrowLeft size={16} /> Nazad na početnu</Link>
      </div>
      <Style />
    </div>
  );
}

function Style() {
  return (
    <style jsx global>{`
      .pr-container {
        min-height: 100vh; min-height: 100dvh;
        display: flex; align-items: center; justify-content: center;
        padding: calc(var(--navbar-height, 4.75rem) + 1.5rem) 1rem 2rem;
        padding-bottom: env(safe-area-inset-bottom, 1rem);
        background: #030308;
      }
      .pr-box {
        width: 100%; max-width: 480px;
        padding: 2.5rem 2rem;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 24px;
        background: rgba(8,8,18,0.95);
        box-shadow: 0 40px 80px rgba(0,0,0,0.5);
      }
      .pr-box h2 { color: #f8fafc; font-size: 1.8rem; font-weight: 900; margin-bottom: 1.5rem; text-align: center; }
      .pr-info-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px; padding: 1.2rem; margin-bottom: 2rem;
      }
      .pr-info-row {
        display: flex; align-items: center; gap: 0.65rem;
        color: #cbd5e1; font-size: 0.9rem; font-weight: 500;
        padding: 0.4rem 0;
      }
      .pr-info-row svg { color: #64748b; flex-shrink: 0; }
      .pr-section { margin-bottom: 1.5rem; }
      .pr-section h3 { color: #e2e8f0; font-size: 1.05rem; font-weight: 800; margin-bottom: 1rem; }
      .pr-input-group {
        display: flex; align-items: center; gap: 0.85rem;
        padding: 0.85rem 1.1rem;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px; margin-bottom: 0.85rem; color: #94a3b8;
      }
      .pr-input-group:focus-within { border-color: #cda667; box-shadow: 0 0 0 1px rgba(205,166,103,0.45); }
      .pr-input-group input {
        background: none; border: none; color: #f8fafc; width: 100%;
        outline: none; font-size: 16px; font-weight: 500;
        -webkit-appearance: none; appearance: none;
      }
      .pr-input-group input:-webkit-autofill,
      .pr-input-group input:-webkit-autofill:hover,
      .pr-input-group input:-webkit-autofill:focus {
        -webkit-box-shadow: 0 0 0 1000px rgba(8,8,18,1) inset !important;
        -webkit-text-fill-color: #f8fafc !important;
      }
      .pr-eye { border: none; background: transparent; padding: 0; cursor: pointer; color: #64748b; display: inline-flex; }
      .pr-eye:hover { color: #f1f5f9; }
      .pr-btn {
        width: 100%; padding: 0.85rem;
        background: linear-gradient(120deg, #4d5de8, #cda667);
        color: #050505; border: none; border-radius: 999px;
        font-weight: 800; font-size: 0.9rem; cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .pr-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
      .pr-btn:disabled { opacity: 0.7; cursor: not-allowed; }
      .pr-success {
        background: rgba(16,185,129,0.15); color: #bbf7d0;
        padding: 0.85rem 1rem; border-radius: 12px; font-size: 0.85rem;
        font-weight: 600; margin-bottom: 1rem;
        border: 1px solid rgba(16,185,129,0.3); text-align: center;
      }
      .pr-error {
        background: rgba(239,68,68,0.15); color: #fecaca;
        padding: 0.85rem 1rem; border-radius: 12px; font-size: 0.85rem;
        font-weight: 600; margin-bottom: 1rem;
        border: 1px solid rgba(239,68,68,0.4);
      }
      .pr-back {
        display: flex; align-items: center; justify-content: center; gap: 0.4rem;
        margin-top: 1.5rem; color: #94a3b8; font-size: 0.85rem; font-weight: 600;
        text-decoration: none; -webkit-tap-highlight-color: transparent;
      }
      .pr-back:hover { color: #cda667; }
      @media (max-width: 640px) {
        .pr-container { padding: calc(var(--navbar-height, 4rem) + 1rem) 0.75rem 1.5rem; }
        .pr-box { padding: 1.8rem 1.25rem; border-radius: 22px; }
        .pr-box h2 { font-size: 1.5rem; }
      }
      @media (max-width: 480px) {
        .pr-box { padding: 1.5rem 1rem; }
        .pr-box h2 { font-size: 1.35rem; }
      }
    `}</style>
  );
}
