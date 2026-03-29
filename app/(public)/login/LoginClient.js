'use client';
import { Mail, Lock, User, ArrowRight, Music, Users, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginClient() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'BAND' 
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState('');
  const [authMode, setAuthMode] = useState('');
  const isPlanSelected = selectedPlan === 'basic' || selectedPlan === 'premium';
  const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true';
  const googleSignInHref =
    '/api/auth/signin/google?callbackUrl=' +
    encodeURIComponent('/api/auth/sync-session');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan') || '';
    const mode = params.get('mode') || '';
    setSelectedPlan(plan);
    setAuthMode(mode);
  }, []);

  useEffect(() => {
    if (selectedPlan === 'premium' || authMode === 'register') {
      setIsLogin(false);
      if (selectedPlan === 'premium') {
        setFormData((prev) => ({ ...prev, role: 'CLIENT' }));
      }
    }
  }, [selectedPlan, authMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const emailTrimmed = String(formData.email || '').trim();
    const passwordTrimmed = String(formData.password || '').trim();
    const confirmTrimmed = String(confirmPassword || '').trim();

    if (!isLogin) {
      if (passwordTrimmed !== confirmTrimmed) {
        setError('Lozinke se ne poklapaju. Proverite i razmake na kraju polja.');
        return;
      }
      if (passwordTrimmed.length < 6) {
        setError('Lozinka mora imati najmanje 6 karaktera.');
        return;
      }
    }

    setIsLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = {
      email: emailTrimmed,
      password: passwordTrimmed,
      ...(isLogin ? {} : { name: String(formData.name || '').trim(), role: formData.role }),
    };
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Nešto nije u redu.');
      }

      if (isLogin) {
        const next =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('next')
            : null;
        if (next && next.startsWith('/') && !next.startsWith('//')) {
          router.push(next);
        } else if (data.user.role === 'ADMIN') {
          router.push('/admin');
        } else if (data.user.role === 'BAND') {
          router.push('/bands');
        } else {
          router.push('/clients');
        }
      } else {
        setSuccess('Registracija uspešna! Prijavite se sa svojim nalogom.');
        setIsLogin(true);
        setConfirmPassword('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="blob" style={{ bottom: '-10%', right: '-10%' }}></div>
      <div className="blob-2" style={{ top: '-10%', left: '-10%' }}></div>

      <div className="login-box glass-card">
        <div className="header-toggle">
          <button type="button" className={isLogin ? 'active' : ''} onClick={() => setIsLogin(true)}>Prijava</button>
          <button type="button" className={!isLogin ? 'active' : ''} onClick={() => setIsLogin(false)}>Registracija</button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-logo-container">
            <Image
              src="/images/logo.png"
              alt="Logo"
              className="login-logo"
              width={132}
              height={132}
              sizes="132px"
              priority
              quality={70}
            />
          </div>
          <h2 className="title">{isLogin ? 'Dobrodošli' : 'Pridruži se'}</h2>
          <p className="subtitle">{isLogin ? 'Povežite se sa Vašim nalogom.' : 'Kreirajte nalog za par minuta.'}</p>

          {isPlanSelected && (
            <div className="plan-alert">
              Izabrani paket: <strong>{selectedPlan === 'premium' ? 'Premium Venue' : 'Basic'}</strong>.
              {selectedPlan === 'premium' ? ' Registrujte nalog klijenta za aktivaciju plana.' : ' Možete odmah početi besplatno.'}
            </div>
          )}
          {success && <div className="success-alert">{success}</div>}

          {error && <div className="error-alert">{error}</div>}

          {!isLogin && (
            <>
              <div className="role-selector">
                <p>Ja sam:</p>
                <div className="role-cards">
                  <div className={`role-card ${formData.role === 'BAND' ? 'active' : ''}`} onClick={() => setFormData({...formData, role: 'BAND'})}>
                    <Music size={20} />
                    <span>Muzičar</span>
                  </div>
                  <div className={`role-card ${formData.role === 'CLIENT' ? 'active' : ''}`} onClick={() => setFormData({...formData, role: 'CLIENT'})}>
                    <Users size={20} />
                    <span>Klijent</span>
                  </div>
                </div>
              </div>
              <div className="input-group">
                <User size={18} className="text-muted" />
                <input 
                  type="text" 
                  placeholder={formData.role === 'BAND' ? 'Ime i prezime / Naziv benda' : 'Ime i prezime'}
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  required 
                />
              </div>
            </>
          )}

          <div className="input-group">
            <Mail size={18} className="text-muted" />
            <input 
              type="email" 
              placeholder="Email adresa" 
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              required 
            />
          </div>

          <div className="input-group">
            <Lock size={18} className="text-muted" />
            <input 
              type="password" 
              placeholder={isLogin ? 'Lozinka' : 'Lozinka (min 6 karaktera)'} 
              value={formData.password} 
              onChange={(e) => setFormData({...formData, password: e.target.value})} 
              required 
            />
          </div>
          {!isLogin && (
            <div className="input-group">
              <Lock size={18} className="text-muted" />
              <input
                type="password"
                placeholder="Potvrdi lozinku"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          <button className="btn btn-primary btn-full auth-submit-btn" type="submit" disabled={isLoading}>
            {isLoading ? 'Učitavanje...' : (isLogin ? 'Prijavi se' : 'Registruj se')} <ArrowRight size={18} style={{marginLeft: '8px'}} />
          </button>

          <p className="public-poster-hint">
            <a
              href="/marketing/poster-A4.png"
              download="PronadjiBend-poster-A4.png"
              className="public-poster-link"
            >
              <Download size={15} aria-hidden />
              Promotivni poster (A4, 300 DPI)
            </a>
            <span className="public-poster-desc">
              Za štampu u lokalu — QR vodi kolege bendove na registraciju.
            </span>
          </p>

          {selectedPlan === 'premium' && (
            <a href="/premium/checkout" className="btn btn-secondary btn-full premium-link-btn">
              Nastavi na Premium plaćanje
            </a>
          )}

          <div className="divider">ili</div>

          <div className="social-login">
            {googleAuthEnabled ? (
              <a className="btn btn-secondary social-btn google-btn" href={googleSignInHref}>
                Nastavi preko Google
              </a>
            ) : (
              <button type="button" className="btn btn-secondary social-btn google-btn" disabled>
                Google prijava uskoro
              </button>
            )}
          </div>
        </form>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
        }
        .login-box {
          width: 100%;
          max-width: 480px;
          padding: 2.25rem;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.1);
        }

        .public-poster-hint {
          margin: 1rem 0 0;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
        }
        .public-poster-link {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.84rem;
          font-weight: 700;
          color: #0d9488;
          text-decoration: none;
        }
        .public-poster-link:hover {
          text-decoration: underline;
        }
        .public-poster-desc {
          font-size: 0.75rem;
          color: #64748b;
          line-height: 1.4;
          max-width: 22rem;
        }
        
        .login-logo-container { display: flex; justify-content: center; margin-bottom: 2rem; }
        .login-logo { width: 132px; height: auto; filter: drop-shadow(0 10px 18px rgba(0, 122, 255, 0.2)); }
        
        .header-toggle {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          background: #f1f5f9;
          border-radius: 999px;
          padding: 0.35rem;
          margin-bottom: 1.6rem;
        }
        .header-toggle button {
          border: none;
          background: transparent;
          color: #475569;
          padding: 0.65rem 0.9rem;
          border-radius: 999px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .header-toggle button.active {
          color: #0f172a;
          background: #ffffff;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
        }
        
        .title { font-size: 2rem; margin-bottom: 0.4rem; font-weight: 900; letter-spacing: -0.02em; color: #0f172a; text-align: center; }
        .subtitle { color: #64748b; margin-bottom: 1.5rem; font-size: 0.9rem; text-align: center; }
        
        .error-alert { background: #fef2f2; color: #dc2626; padding: 0.85rem 1rem; border-radius: 10px; font-size: 0.84rem; font-weight: 600; margin-bottom: 1rem; border: 1px solid #fecaca; }
        .success-alert { background: #ecfdf5; color: #047857; padding: 0.85rem 1rem; border-radius: 10px; font-size: 0.84rem; font-weight: 600; margin-bottom: 1rem; border: 1px solid #a7f3d0; }
        .plan-alert { background: #eff6ff; color: #1d4ed8; padding: 0.85rem 1rem; border-radius: 10px; font-size: 0.84rem; font-weight: 600; margin-bottom: 1rem; border: 1px solid #bfdbfe; line-height: 1.5; }

        .role-selector { margin-bottom: 1rem; }
        .role-selector p { font-size: 0.8rem; font-weight: 700; color: #555; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px; }
        .role-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .role-card { background: #ffffff; border: 1px solid #e2e8f0; padding: 0.9rem; border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 0.55rem; transition: 0.2s ease; }
        .role-card span { font-size: 0.82rem; font-weight: 700; color: #64748b; }
        .role-card.active { border-color: #007aff; background: #eff6ff; }
        .role-card.active span { color: #0f172a; }
        .role-card.active :global(svg) { color: #007aff; }

        .input-group { position: relative; display: flex; align-items: center; gap: 0.85rem; padding: 0.75rem 1rem; background: #ffffff; border: 1px solid #dbe1ea; border-radius: 12px; margin-bottom: 0.9rem; transition: 0.2s ease; }
        .input-group:focus-within { border-color: #007aff; box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.12); }
        .input-group input { background: none; border: none; color: #0f172a; width: 100%; outline: none; font-size: 0.95rem; font-weight: 500; }
        .input-group :global(svg) { color: #94a3b8; }
        
        .divider { margin: 1.4rem 0; text-align: center; color: #94a3b8; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; position: relative; }
        .divider:before, .divider:after { content: ''; position: absolute; height: 1px; width: 40%; background: #e2e8f0; top: 50%; }
        .divider:before { left: 0; }
        .divider:after { right: 0; }
        
        .social-login { display: grid; grid-template-columns: 1fr; gap: 1rem; }
        .social-btn { height: 44px; font-size: 0.85rem; font-weight: 700; }
        .google-btn {
          border: 1px solid #dbe1ea;
          color: #0f172a;
          background: #ffffff;
          border-radius: 999px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
        }
        .google-btn:hover {
          border-color: #007aff;
          color: #007aff;
          transform: translateY(-1px);
        }
        .auth-submit-btn {
          border: 1px solid #005fcc;
          background: linear-gradient(135deg, #007aff 0%, #0a84ff 45%, #38bdf8 100%);
          color: #ffffff;
          border-radius: 999px;
          font-weight: 800;
          letter-spacing: 0.02em;
          box-shadow: 0 10px 24px rgba(0, 122, 255, 0.35);
        }
        .auth-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(0, 122, 255, 0.45);
          filter: saturate(1.05);
        }
        .auth-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .premium-link-btn {
          margin-top: 0.75rem;
          border-radius: 999px;
        }
        .btn-full { width: 100%; }

        @media (max-width: 640px) {
          .login-box { padding: 1.4rem 1rem; border-radius: 18px; }
          .login-logo { width: 116px; }
          .title { font-size: 1.65rem; }
          .header-toggle button { font-size: 0.8rem; padding: 0.8rem 0.5rem; }
          .input-group { padding: 0.68rem 0.85rem; margin-bottom: 0.8rem; }
        }
        
        @media (max-width: 480px) {
          .login-container { padding: 1.25rem 0.75rem; }
          .login-box { padding: 1.2rem 0.8rem; }
          .title { font-size: 1.45rem; }
          .subtitle { margin-bottom: 1.2rem; font-size: 0.82rem; }
          .social-btn { height: 44px; }
        }
      `}</style>
    </div>
  );
}
