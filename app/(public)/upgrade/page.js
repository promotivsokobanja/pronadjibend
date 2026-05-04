'use client';

import { useEffect, useState } from 'react';
import { Crown, Zap, QrCode, CheckCircle2, Loader2 } from 'lucide-react';

const PLANS = [
  {
    id: 'PREMIUM',
    name: 'Premium',
    icon: Zap,
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    features: [
      'MIDI biblioteka',
      'Više aktivnih poziva muzičarima',
      'Chat komunikacija',
      'Prioritet u pretrazi',
    ],
  },
  {
    id: 'PREMIUM_VENUE',
    name: 'Premium Venue',
    icon: Crown,
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    features: [
      'Sve iz Premium plana',
      'Korg PA setovi (download)',
      'Video upload na profil',
      'Audio (MP3) upload',
      'Maksimalan broj poziva',
    ],
  },
];

export default function UpgradePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [qrResult, setQrResult] = useState(null);
  const [error, setError] = useState('');
  const [pricing, setPricing] = useState(null);
  const [billingData, setBillingData] = useState({
    companyName: '',
    pib: '',
    mb: '',
    address: '',
  });
  const [showBilling, setShowBilling] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [meRes, configRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/billing/pricing'),
        ]);
        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user || null);
          if (meData.user?.billingDataJson) {
            try {
              const bd = JSON.parse(meData.user.billingDataJson);
              setBillingData((prev) => ({ ...prev, ...bd }));
              if (bd.companyName || bd.pib) setShowBilling(true);
            } catch { /* ignore */ }
          }
        }
        if (configRes.ok) {
          const configData = await configRes.json();
          setPricing(configData);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const generateQr = async (planId) => {
    setError('');
    setGenerating(true);
    setSelectedPlan(planId);
    setQrResult(null);
    try {
      const r = await fetch('/api/billing/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planId,
          billingData: showBilling ? billingData : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška');
      setQrResult(j);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const getPriceEur = (planId) => {
    if (!pricing) return planId === 'PREMIUM_VENUE' ? 79 : 49;
    return planId === 'PREMIUM_VENUE' ? pricing.premiumVenuePriceEur : pricing.premiumPriceEur;
  };

  const getPriceRsd = (planId) => {
    const eur = getPriceEur(planId);
    const rate = pricing?.eurToRsdRate || 117.5;
    return Math.round(eur * rate * 100) / 100;
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#94a3b8' }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.title}>Nadogradite nalog</h1>
          <p style={styles.subtitle}>Morate biti prijavljeni da biste nadogradili plan.</p>
          <a href="/login" style={styles.loginBtn}>Prijavi se</a>
        </div>
      </div>
    );
  }

  const currentPlan = String(user.plan || 'BASIC').toUpperCase();
  const isPremium = currentPlan === 'PREMIUM' || currentPlan === 'PREMIUM_VENUE';
  const planUntil = user.planUntil ? new Date(user.planUntil) : null;
  const isExpired = planUntil && planUntil < new Date();

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>
          {isPremium && !isExpired ? 'Vaša pretplata' : 'Nadogradite nalog'}
        </h1>
        <p style={styles.subtitle}>
          {isPremium && !isExpired
            ? `Trenutno ste na ${currentPlan === 'PREMIUM_VENUE' ? 'Premium Venue' : 'Premium'} planu${planUntil ? ` do ${planUntil.toLocaleDateString('sr-RS')}` : ''}.`
            : 'Izaberite plan i skenirajte QR kod za uplatu putem mobilnog bankarstva.'}
        </p>

        {/* ── Plan kartice ── */}
        {!qrResult && (
          <div style={styles.plansGrid}>
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = currentPlan === plan.id && !isExpired;
              return (
                <div key={plan.id} style={{ ...styles.planCard, borderColor: isCurrentPlan ? plan.color : 'rgba(148,163,184,0.15)' }}>
                  <div style={{ ...styles.planHeader, background: plan.gradient }}>
                    <Icon size={24} color="#fff" />
                    <span style={styles.planName}>{plan.name}</span>
                  </div>
                  <div style={styles.planBody}>
                    <div style={styles.priceRow}>
                      <span style={styles.priceEur}>{getPriceEur(plan.id)} EUR</span>
                      <span style={styles.priceRsd}>{getPriceRsd(plan.id).toLocaleString('sr-RS')} RSD</span>
                    </div>
                    <p style={styles.pricePeriod}>godišnje</p>
                    <ul style={styles.featureList}>
                      {plan.features.map((f) => (
                        <li key={f} style={styles.featureItem}>
                          <CheckCircle2 size={14} color={plan.color} style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    {isCurrentPlan ? (
                      <div style={{ ...styles.currentBadge, background: `${plan.color}20`, color: plan.color }}>
                        Aktivan plan
                      </div>
                    ) : (
                      <button
                        type="button"
                        style={{ ...styles.selectBtn, background: plan.gradient }}
                        disabled={generating}
                        onClick={() => generateQr(plan.id)}
                      >
                        {generating && selectedPlan === plan.id ? (
                          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <>
                            <QrCode size={16} />
                            Generiši QR za uplatu
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Billing data toggle ── */}
        {!qrResult && (
          <div style={styles.billingToggle}>
            <label style={styles.checkLabel}>
              <input
                type="checkbox"
                checked={showBilling}
                onChange={(e) => setShowBilling(e.target.checked)}
              />
              Uplata na firmu (unesi PIB / MB)
            </label>
            {showBilling && (
              <div style={styles.billingGrid}>
                {[
                  { key: 'companyName', label: 'Naziv firme', placeholder: 'Moja Firma DOO' },
                  { key: 'pib', label: 'PIB', placeholder: '123456789' },
                  { key: 'mb', label: 'Matični broj', placeholder: '12345678' },
                  { key: 'address', label: 'Adresa', placeholder: 'Ulica 123, Grad' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>{label}</label>
                    <input
                      type="text"
                      style={styles.fieldInput}
                      placeholder={placeholder}
                      value={billingData[key]}
                      onChange={(e) => setBillingData((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}

        {/* ── QR rezultat ── */}
        {qrResult && (
          <div style={styles.qrCard}>
            <h2 style={styles.qrTitle}>
              Skenirajte QR kod za uplatu
            </h2>
            <p style={styles.qrSubtitle}>
              Otvorite mobilno bankarstvo, izaberite &ldquo;Plati putem QR koda&rdquo; i skenirajte.
            </p>
            <div style={styles.qrImageWrap}>
              <img
                src={qrResult.qrDataUrl}
                alt="IPS QR kod za uplatu"
                width={260}
                height={260}
                style={styles.qrImage}
              />
            </div>
            <div style={styles.qrDetails}>
              <div style={styles.qrDetailRow}>
                <span style={styles.qrLabel}>Plan:</span>
                <span style={styles.qrValue}>
                  {qrResult.payment.plan === 'PREMIUM_VENUE' ? 'Premium Venue' : 'Premium'}
                </span>
              </div>
              <div style={styles.qrDetailRow}>
                <span style={styles.qrLabel}>Iznos:</span>
                <span style={styles.qrValue}>
                  {Number(qrResult.payment.amountRsd).toLocaleString('sr-RS')} RSD ({qrResult.payment.amountEur} EUR)
                </span>
              </div>
              <div style={styles.qrDetailRow}>
                <span style={styles.qrLabel}>Poziv na broj:</span>
                <span style={{ ...styles.qrValue, fontFamily: 'ui-monospace, monospace' }}>
                  {qrResult.payment.referenceId}
                </span>
              </div>
              <div style={styles.qrDetailRow}>
                <span style={styles.qrLabel}>Primalac:</span>
                <span style={styles.qrValue}>ProMotiv — OTP Banka</span>
              </div>
            </div>
            <p style={styles.qrNote}>
              Nakon uplate, admin će potvrditi prijem i vaš nalog će automatski biti nadograđen.
              PDF račun će biti poslat na vaš email.
            </p>
            <button
              type="button"
              style={styles.backBtn}
              onClick={() => { setQrResult(null); setSelectedPlan(null); }}
            >
              ← Nazad na izbor plana
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Inline styles (dark theme, consistent with site) ────────
const styles = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0a',
    display: 'flex',
    justifyContent: 'center',
    padding: '2rem 1rem 4rem',
  },
  container: {
    maxWidth: 780,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#f1f5f9',
    marginBottom: '0.5rem',
    textAlign: 'center',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '1rem',
    textAlign: 'center',
    marginBottom: '2rem',
    maxWidth: 520,
    lineHeight: 1.6,
  },
  loginBtn: {
    display: 'inline-block',
    padding: '12px 32px',
    background: '#3b82f6',
    color: '#fff',
    borderRadius: 10,
    fontWeight: 700,
    textDecoration: 'none',
    fontSize: '0.95rem',
  },
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.25rem',
    width: '100%',
    marginBottom: '1.5rem',
  },
  planCard: {
    borderRadius: 16,
    border: '1px solid rgba(148,163,184,0.15)',
    background: '#111827',
    overflow: 'hidden',
    transition: 'border-color 0.2s',
  },
  planHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    padding: '1rem 1.25rem',
  },
  planName: {
    color: '#fff',
    fontSize: '1.15rem',
    fontWeight: 800,
  },
  planBody: {
    padding: '1.25rem',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.65rem',
  },
  priceEur: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#f1f5f9',
  },
  priceRsd: {
    fontSize: '0.9rem',
    color: '#64748b',
  },
  pricePeriod: {
    fontSize: '0.82rem',
    color: '#64748b',
    margin: '0.2rem 0 1rem',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    color: '#cbd5e1',
    fontSize: '0.88rem',
    lineHeight: 1.5,
  },
  selectBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  currentBadge: {
    textAlign: 'center',
    padding: '0.6rem 1rem',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: '0.88rem',
  },
  billingToggle: {
    width: '100%',
    marginBottom: '1rem',
  },
  checkLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#94a3b8',
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
  billingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '0.75rem',
    marginTop: '0.75rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  fieldLabel: {
    fontSize: '0.78rem',
    color: '#94a3b8',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  fieldInput: {
    width: '100%',
    padding: '0.6rem 0.8rem',
    borderRadius: 8,
    border: '1px solid rgba(148,163,184,0.25)',
    background: '#1e293b',
    color: '#e2e8f0',
    fontSize: '0.88rem',
    boxSizing: 'border-box',
  },
  error: {
    color: '#f87171',
    fontSize: '0.9rem',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  qrCard: {
    width: '100%',
    maxWidth: 480,
    background: '#111827',
    borderRadius: 16,
    border: '1px solid rgba(148,163,184,0.15)',
    padding: '2rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#f1f5f9',
    marginBottom: '0.4rem',
    textAlign: 'center',
  },
  qrSubtitle: {
    color: '#94a3b8',
    fontSize: '0.88rem',
    textAlign: 'center',
    marginBottom: '1.25rem',
    lineHeight: 1.5,
  },
  qrImageWrap: {
    background: '#fff',
    borderRadius: 12,
    padding: '1rem',
    marginBottom: '1.25rem',
  },
  qrImage: {
    display: 'block',
  },
  qrDetails: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.55rem',
    marginBottom: '1rem',
  },
  qrDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.45rem 0',
    borderBottom: '1px solid rgba(148,163,184,0.08)',
  },
  qrLabel: {
    color: '#94a3b8',
    fontSize: '0.82rem',
    fontWeight: 600,
  },
  qrValue: {
    color: '#e2e8f0',
    fontSize: '0.88rem',
    fontWeight: 700,
  },
  qrNote: {
    color: '#64748b',
    fontSize: '0.8rem',
    textAlign: 'center',
    lineHeight: 1.55,
    marginBottom: '1rem',
  },
  backBtn: {
    background: 'transparent',
    border: '1px solid rgba(148,163,184,0.25)',
    color: '#94a3b8',
    borderRadius: 8,
    padding: '0.6rem 1.25rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
