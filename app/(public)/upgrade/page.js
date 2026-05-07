'use client';

import { useEffect, useState, useRef } from 'react';
import { Crown, Zap, CheckCircle2, Loader2, Copy, Check, ChevronDown, FileDown, CreditCard } from 'lucide-react';

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

// Podaci za prenos — isti su kao u lib/ipsQr.js
const FIRM_ACCOUNT = '325-9500700031761-69';
const FIRM_NAME = 'ProMotiv';
const FIRM_BANK = 'OTP Banka';

export default function UpgradePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [error, setError] = useState('');
  const [pricing, setPricing] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState('');
  const [billingData, setBillingData] = useState({
    companyName: '',
    pib: '',
    mb: '',
    address: '',
  });
  const [showBilling, setShowBilling] = useState(false);
  const pdfLinkRef = useRef(null);

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

  const handleSelectPlan = async (planId) => {
    setError('');
    setGenerating(true);
    setSelectedPlan(planId);
    setPaymentResult(null);
    setShowQr(false);
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
      setPaymentResult(j);
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

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const handleDownloadPdf = () => {
    if (!paymentResult) return;
    // Otvara print-friendly verziju sa QR kodom
    const w = window.open('', '_blank');
    const p = paymentResult.payment;
    const planLabel = p.plan === 'PREMIUM_VENUE' ? 'Premium Venue' : 'Premium';
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Nalog za uplatu - PronadjiBend ${planLabel}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:2rem;max-width:600px;margin:0 auto;color:#1e293b}
        h1{font-size:1.4rem;margin-bottom:0.5rem}
        .subtitle{color:#64748b;margin-bottom:1.5rem}
        table{width:100%;border-collapse:collapse;margin-bottom:1.5rem}
        td{padding:0.6rem 0.4rem;border-bottom:1px solid #e2e8f0}
        td:first-child{font-weight:600;color:#475569;width:40%}
        td:last-child{font-weight:700;font-family:ui-monospace,monospace}
        .qr-section{text-align:center;margin-top:1.5rem;padding-top:1.5rem;border-top:2px dashed #cbd5e1}
        .qr-section img{width:220px;height:220px}
        .qr-section p{color:#64748b;font-size:0.85rem;margin-top:0.5rem}
        .footer{margin-top:2rem;font-size:0.8rem;color:#94a3b8;text-align:center}
        @media print{body{padding:1rem}}
      </style>
    </head><body>
      <h1>Nalog za uplatu — PronadjiBend</h1>
      <p class="subtitle">Plan: ${planLabel} · Mesečna pretplata</p>
      <table>
        <tr><td>Primalac</td><td>${FIRM_NAME}</td></tr>
        <tr><td>Banka</td><td>${FIRM_BANK}</td></tr>
        <tr><td>Broj računa</td><td>${FIRM_ACCOUNT}</td></tr>
        <tr><td>Iznos</td><td>${Number(p.amountRsd).toLocaleString('sr-RS')} RSD (${p.amountEur} EUR)</td></tr>
        <tr><td>Poziv na broj</td><td>00${p.referenceId}</td></tr>
        <tr><td>Model</td><td>00</td></tr>
        <tr><td>Svrha uplate</td><td>PronadjiBend ${planLabel}</td></tr>
        <tr><td>Šifra plaćanja</td><td>289</td></tr>
      </table>
      <div class="qr-section">
        <p><strong>IPS QR kod</strong> — skenirajte za automatsko popunjavanje naloga</p>
        <img src="${paymentResult.qrDataUrl}" alt="IPS QR kod"/>
        <p>Skenirajte ovaj kod kamerom u mobilnom bankarstvu za brzo plaćanje.</p>
      </div>
      <div class="footer">
        <p>PronadjiBend.rs · ProMotiv · PIB: 108191504 · MB: 63280801</p>
        <p>Rok za uplatu: 7 dana od generisanja naloga</p>
      </div>
      <script>setTimeout(()=>window.print(),500)<\/script>
    </body></html>`);
    w.document.close();
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
            : 'Izaberite plan i izvršite uplatu putem mobilnog bankarstva ili šaltera.'}
        </p>

        {/* ── Plan kartice ── */}
        {!paymentResult && (
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
                    <p style={styles.pricePeriod}>mesečno</p>
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
                        onClick={() => handleSelectPlan(plan.id)}
                      >
                        {generating && selectedPlan === plan.id ? (
                          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <>
                            <CreditCard size={16} />
                            Izaberi i plati
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
        {!paymentResult && (
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

        {/* ── Rezultat: Podaci za uplatu ── */}
        {paymentResult && (
          <div style={styles.paymentCard}>
            <div style={styles.paymentHeader}>
              <CreditCard size={20} color="#3b82f6" />
              <h2 style={styles.paymentTitle}>Podaci za uplatu</h2>
            </div>
            <p style={styles.paymentSubtitle}>
              Otvorite mobilno bankarstvo → Novo plaćanje → Unesite podatke ispod.
            </p>

            {/* ── Tabela podataka ── */}
            <div style={styles.dataTable}>
              {[
                { label: 'Primalac', value: FIRM_NAME, key: 'name' },
                { label: 'Banka', value: FIRM_BANK, key: 'bank' },
                { label: 'Broj računa', value: FIRM_ACCOUNT, key: 'account' },
                { label: 'Iznos', value: `${Number(paymentResult.payment.amountRsd).toLocaleString('sr-RS')} RSD`, key: 'amount' },
                { label: 'Poziv na broj', value: `00${paymentResult.payment.referenceId}`, key: 'ref' },
                { label: 'Model', value: '00', key: 'model' },
                { label: 'Svrha uplate', value: `PronadjiBend ${paymentResult.payment.plan === 'PREMIUM_VENUE' ? 'Premium Venue' : 'Premium'}`, key: 'purpose' },
                { label: 'Šifra plaćanja', value: '289', key: 'code' },
              ].map(({ label, value, key }) => (
                <div key={key} style={styles.dataRow}>
                  <span style={styles.dataLabel}>{label}</span>
                  <span style={styles.dataValue}>
                    {value}
                    <button
                      type="button"
                      style={styles.copyBtn}
                      onClick={() => copyToClipboard(value, key)}
                      title="Kopiraj"
                    >
                      {copied === key ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                    </button>
                  </span>
                </div>
              ))}
            </div>

            <p style={styles.noteBox}>
              <strong>Rok za uplatu:</strong> 7 dana · Nakon uplate admin potvrđuje prijem i vaš nalog se automatski nadograđuje.
              PDF račun stiže na vaš email.
            </p>

            {/* ── QR sekcija (sklopiva) ── */}
            <div style={styles.qrToggleWrap}>
              <button
                type="button"
                style={styles.qrToggleBtn}
                onClick={() => setShowQr(!showQr)}
              >
                <ChevronDown size={16} style={{ transform: showQr ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }} />
                {showQr ? 'Sakrij QR kod' : 'Prikaži QR kod za skeniranje'}
              </button>

              {showQr && (
                <div style={styles.qrSection}>
                  <p style={styles.qrHint}>
                    Skenirajte ovaj kod kamerom u mobilnom bankarstvu za automatsko popunjavanje naloga.
                  </p>
                  <div style={styles.qrImageWrap}>
                    <img
                      src={paymentResult.qrDataUrl}
                      alt="IPS QR kod za uplatu"
                      width={240}
                      height={240}
                      style={styles.qrImage}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Dugmad ── */}
            <div style={styles.actionRow}>
              <button type="button" style={styles.pdfBtn} onClick={handleDownloadPdf}>
                <FileDown size={16} />
                Odštampaj nalog za uplatu
              </button>
              <button
                type="button"
                style={styles.backBtn}
                onClick={() => { setPaymentResult(null); setSelectedPlan(null); setShowQr(false); }}
              >
                ← Nazad na izbor plana
              </button>
            </div>
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
  // ── Payment result card ──
  paymentCard: {
    width: '100%',
    maxWidth: 560,
    background: '#111827',
    borderRadius: 16,
    border: '1px solid rgba(148,163,184,0.15)',
    padding: '2rem 1.5rem',
  },
  paymentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    marginBottom: '0.4rem',
  },
  paymentTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#f1f5f9',
    margin: 0,
  },
  paymentSubtitle: {
    color: '#94a3b8',
    fontSize: '0.88rem',
    lineHeight: 1.5,
    marginBottom: '1.25rem',
  },
  dataTable: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '1rem',
  },
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.6rem 0',
    borderBottom: '1px solid rgba(148,163,184,0.08)',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  dataLabel: {
    color: '#94a3b8',
    fontSize: '0.82rem',
    fontWeight: 600,
    flexShrink: 0,
  },
  dataValue: {
    color: '#e2e8f0',
    fontSize: '0.88rem',
    fontWeight: 700,
    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    wordBreak: 'break-all',
  },
  copyBtn: {
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: '2px',
    flexShrink: 0,
  },
  noteBox: {
    background: 'rgba(59,130,246,0.08)',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: 10,
    padding: '0.75rem 1rem',
    color: '#94a3b8',
    fontSize: '0.8rem',
    lineHeight: 1.6,
    marginBottom: '1.25rem',
  },
  // ── QR toggle ──
  qrToggleWrap: {
    width: '100%',
    marginBottom: '1.25rem',
  },
  qrToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(148,163,184,0.06)',
    border: '1px solid rgba(148,163,184,0.15)',
    borderRadius: 10,
    padding: '0.65rem 1rem',
    color: '#94a3b8',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    justifyContent: 'center',
  },
  qrSection: {
    marginTop: '1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  qrHint: {
    color: '#64748b',
    fontSize: '0.8rem',
    textAlign: 'center',
    marginBottom: '0.75rem',
    lineHeight: 1.5,
  },
  qrImageWrap: {
    background: '#fff',
    borderRadius: 12,
    padding: '1rem',
  },
  qrImage: {
    display: 'block',
  },
  // ── Action buttons ──
  actionRow: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pdfBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.7rem 1.25rem',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  backBtn: {
    background: 'transparent',
    border: '1px solid rgba(148,163,184,0.25)',
    color: '#94a3b8',
    borderRadius: 10,
    padding: '0.7rem 1.25rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
