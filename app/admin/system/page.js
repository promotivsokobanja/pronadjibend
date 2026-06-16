'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/adminFetch';

const createEmptyKorgItem = (index = 0) => ({ id: `korg-item-${Date.now()}-${index}`, name: '', url: '' });

export default function AdminSystemPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [savingDemo, setSavingDemo] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [savingKorg, setSavingKorg] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);
  const [savingInviteCommunication, setSavingInviteCommunication] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [demoMsg, setDemoMsg] = useState('');
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [korgMsg, setKorgMsg] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [limitsMsg, setLimitsMsg] = useState('');
  const [inviteCommunicationMsg, setInviteCommunicationMsg] = useState('');
  const [pricingMsg, setPricingMsg] = useState('');
  const [contactForm, setContactForm] = useState({ email: '', phone: '', location: '', instagram: '', facebook: '' });
  const [limitsForm, setLimitsForm] = useState({ maxImages: 5, maxVideos: 3, maxLinks: 5 });
  const [inviteCommunicationForm, setInviteCommunicationForm] = useState({
    inviteMaxActiveBasic: 5,
    inviteMaxActivePremium: 20,
    inviteExpireDays: 14,
    inviteCleanupDays: 180,
    inviteEmailNotifications: true,
  });
  const [pricingForm, setPricingForm] = useState({ eurToRsdRate: 117.5, premiumPriceEur: 49, premiumVenuePriceEur: 79 });
  const [korgItems, setKorgItems] = useState([createEmptyKorgItem()]);
  const [isCompactKorgEditor, setIsCompactKorgEditor] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const syncCompact = () => setIsCompactKorgEditor(window.innerWidth <= 900);
    syncCompact();
    window.addEventListener('resize', syncCompact);
    return () => window.removeEventListener('resize', syncCompact);
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await adminFetch('/api/admin/system');
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška');
      setData(j);
      const loadedItems = Array.isArray(j.korgPaItems) && j.korgPaItems.length ? j.korgPaItems : j.korgPaDriveUrl ? [{ id: 'korg-legacy', name: 'Korg PA setovi', url: j.korgPaDriveUrl }] : [createEmptyKorgItem()];
      setKorgItems(loadedItems);
      if (j.contactInfo) {
        setContactForm({ email: j.contactInfo.email || '', phone: j.contactInfo.phone || '', location: j.contactInfo.location || '', instagram: j.contactInfo.instagram || '', facebook: j.contactInfo.facebook || '' });
      }
      if (j.bandProfileLimits) {
        setLimitsForm({ maxImages: j.bandProfileLimits.maxImages ?? 5, maxVideos: j.bandProfileLimits.maxVideos ?? 3, maxLinks: j.bandProfileLimits.maxLinks ?? 5 });
      }
      if (j.pricingConfig) {
        setPricingForm({
          eurToRsdRate: j.pricingConfig.eurToRsdRate ?? 117.5,
          premiumPriceEur: j.pricingConfig.premiumPriceEur ?? 49,
          premiumVenuePriceEur: j.pricingConfig.premiumVenuePriceEur ?? 79,
        });
      }
      if (j.inviteCommunication) {
        setInviteCommunicationForm({
          inviteMaxActiveBasic: j.inviteCommunication.inviteMaxActiveBasic ?? 5,
          inviteMaxActivePremium: j.inviteCommunication.inviteMaxActivePremium ?? 20,
          inviteExpireDays: j.inviteCommunication.inviteExpireDays ?? 14,
          inviteCleanupDays: j.inviteCommunication.inviteCleanupDays ?? 180,
          inviteEmailNotifications: j.inviteCommunication.inviteEmailNotifications !== false,
        });
      }
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleDemoBands = async () => {
    if (!data || data.demoBandsEnvLocked) return;
    setSavingDemo(true);
    setDemoMsg('');
    try {
      const r = await adminFetch('/api/admin/system/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showDemoBands: !data.showDemoBands }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška pri čuvanju');
      setData((prev) => (prev ? { ...prev, showDemoBands: j.showDemoBands } : prev));
      setDemoMsg('Sačuvano.');
    } catch (e) {
      setDemoMsg(e.message);
    } finally {
      setSavingDemo(false);
    }
  };

  const saveKorgDriveLink = async () => {
    setSavingKorg(true);
    setKorgMsg('');
    try {
      const payloadItems = korgItems
        .map((item) => ({
          id: item.id,
          name: String(item.name || '').trim(),
          url: String(item.url || '').trim(),
        }))
        .filter((item) => item.name || item.url);
      const r = await adminFetch('/api/admin/system/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ korgPaItems: payloadItems }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška pri čuvanju');
      const nextItems = Array.isArray(j.korgPaItems) && j.korgPaItems.length ? j.korgPaItems : [createEmptyKorgItem()];
      setData((prev) => (prev ? { ...prev, korgPaDriveUrl: j.korgPaDriveUrl || '', korgPaItems: j.korgPaItems || [] } : prev));
      setKorgItems(nextItems);
      setKorgMsg('Sačuvano. Premium Venue korisnici sada mogu da vide Korg PA download stavke kada je lista podešena.');
    } catch (e) {
      setKorgMsg(e.message);
    } finally {
      setSavingKorg(false);
    }
  };

  const updateKorgItem = (id, key, value) => {
    setKorgItems((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const addKorgItem = () => {
    setKorgItems((prev) => [...prev, createEmptyKorgItem(prev.length)]);
  };

  const removeKorgItem = (id) => {
    setKorgItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      return next.length ? next : [createEmptyKorgItem()];
    });
  };

  const saveLimits = async () => {
    setSavingLimits(true);
    setLimitsMsg('');
    try {
      const r = await adminFetch('/api/admin/system/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandProfileLimits: limitsForm }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška pri čuvanju');
      setData((prev) => (prev ? { ...prev, bandProfileLimits: j.bandProfileLimits } : prev));
      setLimitsMsg('Sačuvano.');
    } catch (e) {
      setLimitsMsg(e.message);
    } finally {
      setSavingLimits(false);
    }
  };

  const saveContactInfo = async () => {
    setSavingContact(true);
    setContactMsg('');
    try {
      const r = await adminFetch('/api/admin/system/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactInfo: contactForm }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška pri čuvanju');
      setData((prev) => (prev ? { ...prev, contactInfo: j.contactInfo } : prev));
      setContactMsg('Sačuvano.');
    } catch (e) {
      setContactMsg(e.message);
    } finally {
      setSavingContact(false);
    }
  };

  const saveInviteCommunication = async () => {
    setSavingInviteCommunication(true);
    setInviteCommunicationMsg('');
    try {
      const r = await adminFetch('/api/admin/system/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCommunication: inviteCommunicationForm }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška pri čuvanju');
      setData((prev) => (prev ? { ...prev, inviteCommunication: j.inviteCommunication } : prev));
      setInviteCommunicationForm({
        inviteMaxActiveBasic: j.inviteCommunication.inviteMaxActiveBasic ?? 5,
        inviteMaxActivePremium: j.inviteCommunication.inviteMaxActivePremium ?? 20,
        inviteExpireDays: j.inviteCommunication.inviteExpireDays ?? 14,
        inviteCleanupDays: j.inviteCommunication.inviteCleanupDays ?? 180,
        inviteEmailNotifications: j.inviteCommunication.inviteEmailNotifications !== false,
      });
      setInviteCommunicationMsg('Sačuvano.');
    } catch (e) {
      setInviteCommunicationMsg(e.message);
    } finally {
      setSavingInviteCommunication(false);
    }
  };

  const savePricing = async () => {
    setSavingPricing(true);
    setPricingMsg('');
    try {
      const r = await adminFetch('/api/admin/system/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricingConfig: pricingForm }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška pri čuvanju');
      setData((prev) => (prev ? { ...prev, pricingConfig: j.pricingConfig } : prev));
      setPricingMsg('Sačuvano.');
    } catch (e) {
      setPricingMsg(e.message);
    } finally {
      setSavingPricing(false);
    }
  };

  const toggleMaintenanceMode = async () => {
    if (!data) return;
    setSavingMaintenance(true);
    setMaintenanceMsg('');
    try {
      const r = await adminFetch('/api/admin/system/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenanceMode: !data.maintenanceMode }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška pri čuvanju');
      setData((prev) => (prev ? { ...prev, maintenanceMode: j.maintenanceMode } : prev));
      setMaintenanceMsg('Sačuvano.');
    } catch (e) {
      setMaintenanceMsg(e.message);
    } finally {
      setSavingMaintenance(false);
    }
  };

  if (error) {
    return <p style={{ color: '#f87171' }}>{error}</p>;
  }

  if (!data) {
    return <p style={{ color: '#94a3b8' }}>Učitavanje…</p>;
  }

  const rows = [
    { label: 'Baza podataka (DATABASE_URL)', ok: data.databaseUrl },
    { label: 'JWT tajna (JWT_SECRET ili NEXTAUTH_SECRET, min. 32)', ok: data.jwtSecret },
    { label: 'SMTP email (SMTP_HOST, SMTP_USER, SMTP_PASS)', ok: data.smtpConfigured },
    { label: 'Cron zaštita (CRON_SECRET)', ok: data.cronSecret },
    { label: 'Stripe secret key', ok: data.stripeSecret },
    { label: 'Stripe webhook secret', ok: data.stripeWebhook },
    { label: 'Okruženje', ok: true, text: data.nodeEnv },
  ];

  return (
    <>
      <h1>Sistem</h1>
      <p className="admin-sub">
        Provera da li su ključni servisi podešeni (bez prikaza tajni). Vrednosti menjate u Netlify Environment
        variables ili .env lokalno.
      </p>

      <StorageUsageBar />


      {/* ── Demo bendovi ── */}
      <div className="admin-section">
        <h2>Demo bendovi (javna pretraga i početna)</h2>
        <p>
          Kada su uključeni, demo profili se prikazuju zajedno sa pravim bendovima. Isključite ih kada želite samo
          registrovane izvođače.
        </p>
        {data.demoBandsEnvLocked ? (
          <p className="admin-hint" style={{ color: '#fbbf24' }}>
            <strong>SHOW_DEMO_BANDS</strong> u .env je postavljen na <code>{data.demoBandsEnvValue}</code> — to ima
            prednost nad ovim prekidačem. Uklonite promenljivu iz .env da biste koristili podešavanje ispod.
          </p>
        ) : (
          <>
            <div className="admin-section-footer" style={{ marginTop: 0 }}>
              <span className={`admin-status ${data.showDemoBands ? 'admin-status-on' : 'admin-status-off'}`}>
                {data.showDemoBands ? 'Uključeno' : 'Isključeno'}
              </span>
              <button
                type="button"
                className="admin-btn"
                disabled={savingDemo}
                onClick={toggleDemoBands}
              >
                {savingDemo ? 'Čuvanje…' : data.showDemoBands ? 'Isključi demo bendove' : 'Uključi demo bendove'}
              </button>
              {demoMsg ? <span className="admin-msg-ok">{demoMsg}</span> : null}
            </div>
            <p className="admin-hint" style={{ marginTop: '1rem' }}>
              Hitno isključivanje bez baze: u .env postavite <code>SHOW_DEMO_BANDS=false</code> (ili{' '}
              <code>true</code>).
            </p>
          </>
        )}
      </div>

      {/* ── Maintenance ── */}
      <div className="admin-section">
        <h2>Maintenance Mode (Under Construction)</h2>
        <p>
          Kada je uključen, sajt je nevidljiv za sve posetioce osim za admine. Svi ostali će biti
          preusmereni na &ldquo;Under Construction&rdquo; stranicu.
        </p>
        <div className="admin-section-footer" style={{ marginTop: 0 }}>
          <span className={`admin-status ${data.maintenanceMode ? 'admin-status-warn' : 'admin-status-on'}`}>
            {data.maintenanceMode ? 'AKTIVAN — sajt zaključan' : 'NEAKTIVAN — sajt javan'}
          </span>
          <button
            type="button"
            className={`admin-btn ${data.maintenanceMode ? 'admin-btn-ghost' : 'admin-btn-purple'}`}
            disabled={savingMaintenance}
            onClick={toggleMaintenanceMode}
          >
            {savingMaintenance ? 'Čuvanje…' : data.maintenanceMode ? 'Onemogući Maintenance' : 'Omogući Maintenance'}
          </button>
          {maintenanceMsg ? <span className="admin-msg-ok">{maintenanceMsg}</span> : null}
        </div>
      </div>

      {/* ── Cene i kurs ── */}
      <div className="admin-section">
        <h2>Cene pretplata i kurs</h2>
        <p>
          Fiksni kurs EUR → RSD za IPS QR plaćanja i cene Premium planova.
          Ove vrednosti se koriste pri generisanju QR koda za uplatu.
        </p>
        <div className="admin-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          {[
            { key: 'eurToRsdRate', label: 'Kurs EUR → RSD', min: 1, max: 500, step: 0.01 },
            { key: 'premiumPriceEur', label: 'Premium (EUR)', min: 1, max: 10000, step: 1 },
            { key: 'premiumVenuePriceEur', label: 'Premium Venue (EUR)', min: 1, max: 10000, step: 1 },
          ].map(({ key, label, min, max, step }) => (
            <div key={key}>
              <label>{label}</label>
              <input
                type="number"
                className="admin-field"
                min={min}
                max={max}
                step={step}
                value={pricingForm[key]}
                onChange={(e) => setPricingForm((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
              />
            </div>
          ))}
        </div>
        <p className="admin-hint" style={{ marginTop: '0.65rem' }}>
          Premium: {pricingForm.premiumPriceEur} EUR × {pricingForm.eurToRsdRate} = <strong>{(pricingForm.premiumPriceEur * pricingForm.eurToRsdRate).toFixed(2)} RSD</strong>
          {' | '}
          Premium Venue: {pricingForm.premiumVenuePriceEur} EUR × {pricingForm.eurToRsdRate} = <strong>{(pricingForm.premiumVenuePriceEur * pricingForm.eurToRsdRate).toFixed(2)} RSD</strong>
        </p>
        <div className="admin-section-footer">
          <button type="button" className="admin-btn" disabled={savingPricing} onClick={savePricing}>
            {savingPricing ? 'Čuvanje…' : 'Sačuvaj cene'}
          </button>
          {pricingMsg ? <span className={pricingMsg === 'Sačuvano.' ? 'admin-msg-ok' : 'admin-msg-err'}>{pricingMsg}</span> : null}
        </div>
      </div>

      {/* ── Korg PA setovi ── */}
      <div className="admin-section">
        <h2>Korg PA setovi</h2>
        <p>
          Dodajte više Google Drive linkova za različite Korg PA setove, sound pakete ili fajlove. Stavke se prikazuju
          samo Premium Venue korisnicima na bend i muzičar portalu.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {korgItems.map((item, index) => (
            <div
              key={item.id}
              className="admin-korg-row"
              style={isCompactKorgEditor ? { gridTemplateColumns: '1fr' } : undefined}
            >
              <input
                type="text"
                className="admin-field"
                value={item.name}
                onChange={(e) => updateKorgItem(item.id, 'name', e.target.value)}
                placeholder={`Naziv seta ${index + 1}`}
              />
              <input
                type="url"
                className="admin-field"
                value={item.url}
                onChange={(e) => updateKorgItem(item.id, 'url', e.target.value)}
                placeholder="https://drive.google.com/..."
              />
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={() => removeKorgItem(item.id)}
                style={isCompactKorgEditor ? { width: '100%' } : undefined}
              >
                Obriši
              </button>
            </div>
          ))}
        </div>
        <div className="admin-section-footer">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={addKorgItem}>
            + Dodaj stavku
          </button>
          <button type="button" className="admin-btn" disabled={savingKorg} onClick={saveKorgDriveLink}>
            {savingKorg ? 'Čuvanje…' : 'Sačuvaj stavke'}
          </button>
          <span className={data.korgPaItems?.length ? 'admin-msg-ok' : 'admin-msg-err'} style={{ fontSize: '0.82rem' }}>
            {data.korgPaItems?.length ? `${data.korgPaItems.length} stavki podešeno` : 'Nema podešenih stavki'}
          </span>
        </div>
        {korgMsg ? <p className="admin-hint" style={{ marginTop: '0.65rem' }}>{korgMsg}</p> : null}
      </div>

      {/* ── Limiti bend profila ── */}
      <div className="admin-section">
        <h2>Limiti bend profila</h2>
        <p>
          Maksimalan broj slika, video linkova i spoljnih linkova koje bend može da doda na profil.
        </p>
        <div className="admin-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
          {[
            { key: 'maxImages', label: 'Slike (maks.)', min: 1, max: 20 },
            { key: 'maxVideos', label: 'Video linkovi (maks.)', min: 0, max: 10 },
            { key: 'maxLinks', label: 'Spoljni linkovi (maks.)', min: 0, max: 10 },
          ].map(({ key, label, min, max }) => (
            <div key={key}>
              <label>{label}</label>
              <input
                type="number"
                className="admin-field"
                min={min}
                max={max}
                value={limitsForm[key]}
                onChange={(e) => setLimitsForm((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
              />
            </div>
          ))}
        </div>
        <div className="admin-section-footer">
          <button type="button" className="admin-btn" disabled={savingLimits} onClick={saveLimits}>
            {savingLimits ? 'Čuvanje…' : 'Sačuvaj limite'}
          </button>
          {limitsMsg ? <span className={limitsMsg === 'Sačuvano.' ? 'admin-msg-ok' : 'admin-msg-err'}>{limitsMsg}</span> : null}
        </div>
      </div>

      {/* ── Komunikacija bend ↔ muzičar ── */}
      <div className="admin-section">
        <h2>Komunikacija bend ↔ muzičar</h2>
        <p>
          Podešavanja limita aktivnih poziva, automatskog isteka, perioda čišćenja arhive i email obaveštenja za nove pozive.
        </p>
        <div className="admin-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          {[
            { key: 'inviteMaxActiveBasic', label: 'Free aktivni pozivi', min: 1, max: 100 },
            { key: 'inviteMaxActivePremium', label: 'Premium aktivni pozivi', min: 1, max: 500 },
            { key: 'inviteExpireDays', label: 'Istek PENDING (dana)', min: 1, max: 365 },
            { key: 'inviteCleanupDays', label: 'Čišćenje arhive (dana)', min: 7, max: 3650 },
          ].map(({ key, label, min, max }) => (
            <div key={key}>
              <label>{label}</label>
              <input
                type="number"
                className="admin-field"
                min={min}
                max={max}
                value={inviteCommunicationForm[key]}
                onChange={(e) => setInviteCommunicationForm((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
              />
            </div>
          ))}
        </div>
        <label className="admin-check-label">
          <input
            type="checkbox"
            checked={inviteCommunicationForm.inviteEmailNotifications}
            onChange={(e) => setInviteCommunicationForm((prev) => ({ ...prev, inviteEmailNotifications: e.target.checked }))}
          />
          Šalji email obaveštenje za nove pozive
        </label>
        <div className="admin-section-footer">
          <button type="button" className="admin-btn" disabled={savingInviteCommunication} onClick={saveInviteCommunication}>
            {savingInviteCommunication ? 'Čuvanje…' : 'Sačuvaj pravila komunikacije'}
          </button>
          {inviteCommunicationMsg ? <span className={inviteCommunicationMsg === 'Sačuvano.' ? 'admin-msg-ok' : 'admin-msg-err'}>{inviteCommunicationMsg}</span> : null}
        </div>
      </div>

      {/* ── Kontakt informacije ── */}
      <div className="admin-section">
        <h2>Kontakt informacije (Footer, O nama)</h2>
        <p>
          Prikazuje se u footeru sajta i na &ldquo;O nama&rdquo; stranici. Ostavite prazno da bi se koristile podrazumevane vrednosti.
        </p>
        <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr' }}>
          {[
            { key: 'email', label: 'Email', placeholder: 'office@pronadjibend.rs', type: 'email' },
            { key: 'phone', label: 'Telefon', placeholder: '+381 64 339 2339', type: 'tel' },
            { key: 'location', label: 'Lokacija', placeholder: 'Sokobanja, Srbija', type: 'text' },
            { key: 'instagram', label: 'Instagram URL', placeholder: 'https://instagram.com/pronadjiband', type: 'url' },
            { key: 'facebook', label: 'Facebook URL', placeholder: 'https://www.facebook.com/pronadjibend', type: 'url' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label>{label}</label>
              <input
                type={type}
                className="admin-field"
                value={contactForm[key]}
                onChange={(e) => setContactForm((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
        <div className="admin-section-footer">
          <button type="button" className="admin-btn" disabled={savingContact} onClick={saveContactInfo}>
            {savingContact ? 'Čuvanje…' : 'Sačuvaj kontakt info'}
          </button>
          {contactMsg ? <span className={contactMsg === 'Sačuvano.' ? 'admin-msg-ok' : 'admin-msg-err'}>{contactMsg}</span> : null}
        </div>
      </div>

      {/* ── Sistemski status ── */}
      <div className="admin-section" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem 1.5rem 0' }}>
          <h2>Sistemski status</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.55 }}>Provera konfigurisanosti ključnih servisa.</p>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Stavka</th>
              <th>Stanje</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>
                  {row.text ? (
                    row.text
                  ) : row.ok ? (
                    <span className="admin-status admin-status-on">OK</span>
                  ) : (
                    <span className="admin-status admin-status-off">Nedostaje</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StorageUsageBar() {
  const [usage, setUsage] = useState(null);
  const [loadingStorage, setLoadingStorage] = useState(true);
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await adminFetch('/api/admin/storage-usage');
        const data = await r.json();
        if (r.ok) setUsage(data);
        else setStorageError(data.error || 'Greška pri učitavanju');
      } catch (e) { setStorageError('Timeout — previše fajlova za skeniranje'); }
      finally { setLoadingStorage(false); }
    })();
  }, []);

  if (loadingStorage) {
    return (
      <div style={{ marginBottom: '2rem', padding: '1rem 1.25rem', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '12px' }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Učitavanje storage podataka...</span>
      </div>
    );
  }

  if (storageError) {
    return (
      <div style={{ marginBottom: '2rem', padding: '1rem 1.25rem', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '12px' }}>
        <span style={{ fontSize: '0.8rem', color: '#f87171' }}>Storage: {storageError}</span>
      </div>
    );
  }

  if (!usage) return null;

  const { buckets, totalBytes, limitBytes, usedPercent } = usage;
  const formatSize = (bytes) => {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  };
  const barColor = usedPercent > 80 ? '#f87171' : usedPercent > 50 ? '#fbbf24' : '#4ade80';
  const totalFiles = buckets.reduce((sum, b) => sum + b.files, 0);

  return (
    <div style={{ marginBottom: '2rem', padding: '1rem 1.25rem', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>Storage zauzece ({totalFiles.toLocaleString()} fajlova)</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: barColor }}>{formatSize(totalBytes)} / {formatSize(limitBytes)} ({usedPercent}%)</span>
      </div>
      <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '50px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(usedPercent, 100)}%`, height: '100%', background: barColor, borderRadius: '50px', transition: '0.3s' }} />
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.7rem', flexWrap: 'wrap' }}>
        {buckets.map((b) => (
          <span key={b.bucket} style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <strong style={{ color: '#cbd5e1' }}>{b.bucket}</strong>: {formatSize(b.bytes)} · {b.files.toLocaleString()} fajl.
          </span>
        ))}
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '0.65rem', color: '#64748b' }}>
        Slobodno: {formatSize(limitBytes - totalBytes)} · Supabase Free Plan (1 GB)
      </div>
    </div>
  );
}
