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
  const [demoMsg, setDemoMsg] = useState('');
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [korgMsg, setKorgMsg] = useState('');
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

      <div
        className="admin-table-wrap"
        style={{
          maxWidth: 560,
          marginBottom: '1.75rem',
          padding: '1.25rem',
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.35)',
          background: 'rgba(15, 23, 42, 0.35)',
        }}
      >
        <h2 style={{ fontSize: '1rem', margin: '0 0 0.5rem', fontWeight: 800 }}>Demo bendovi (javna pretraga i početna)</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Kada su uključeni, demo profili se prikazuju zajedno sa pravim bendovima. Isključite ih kada želite samo
          registrovane izvođače.
        </p>
        {data.demoBandsEnvLocked ? (
          <p style={{ color: '#fbbf24', fontSize: '0.875rem', margin: 0 }}>
            <strong>SHOW_DEMO_BANDS</strong> u .env je postavljen na <code>{data.demoBandsEnvValue}</code> — to ima
            prednost nad ovim prekidačem. Uklonite promenljivu iz .env da biste koristili podešavanje ispod.
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: data.showDemoBands ? '#4ade80' : '#f87171' }}>
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
            </div>
            {demoMsg ? (
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>{demoMsg}</p>
            ) : null}
            <p style={{ margin: '1rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Hitno isključivanje bez baze: u .env postavite <code>SHOW_DEMO_BANDS=false</code> (ili{' '}
              <code>true</code>).
            </p>
          </>
        )}
      </div>

      <div
        className="admin-table-wrap"
        style={{
          maxWidth: 560,
          marginBottom: '1.75rem',
          padding: '1.25rem',
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.35)',
          background: 'rgba(15, 23, 42, 0.35)',
        }}
      >
        <h2 style={{ fontSize: '1rem', margin: '0 0 0.5rem', fontWeight: 800 }}>Maintenance Mode (Under Construction)</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Kada je uključen, sajt je nevidljiv za sve posetioce osim za admine. Svi ostali će biti
          preusmereni na &ldquo;Under Construction&rdquo; stranicu.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: data.maintenanceMode ? '#fbbf24' : '#4ade80' }}>
            {data.maintenanceMode ? 'AKTIVAN (Sajt je zaključan)' : 'NEAKTIVAN (Sajt je javan)'}
          </span>
          <button
            type="button"
            className="admin-btn"
            disabled={savingMaintenance}
            onClick={toggleMaintenanceMode}
            style={{
              backgroundColor: data.maintenanceMode ? '#1e293b' : '#7c3aed',
              borderColor: data.maintenanceMode ? '#475569' : '#8b5cf6',
            }}
          >
            {savingMaintenance ? 'Čuvanje…' : data.maintenanceMode ? 'Onemogući Maintenance' : 'Omogući Maintenance'}
          </button>
        </div>
        {maintenanceMsg ? (
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>{maintenanceMsg}</p>
        ) : null}
      </div>

      <div
        className="admin-table-wrap"
        style={{
          maxWidth: 700,
          marginBottom: '1.75rem',
          padding: '1.25rem',
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.35)',
          background: 'rgba(15, 23, 42, 0.35)',
        }}
      >
        <h2 style={{ fontSize: '1rem', margin: '0 0 0.5rem', fontWeight: 800 }}>Korg PA setovi</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Dodajte više Google Drive linkova za različite Korg PA setove, sound pakete ili fajlove. Stavke se prikazuju
          samo Premium Venue korisnicima na bend i muzičar portalu.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {korgItems.map((item, index) => (
            <div
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: isCompactKorgEditor ? '1fr' : 'minmax(180px, 220px) minmax(0, 1fr) auto',
                gap: '0.75rem',
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateKorgItem(item.id, 'name', e.target.value)}
                placeholder={`Naziv seta ${index + 1}`}
                style={{
                  width: '100%',
                  borderRadius: 10,
                  border: '1px solid rgba(148, 163, 184, 0.45)',
                  background: 'rgba(255, 255, 255, 0.96)',
                  color: '#0f172a',
                  padding: '0.8rem 0.9rem',
                  fontSize: '0.95rem',
                }}
              />
              <input
                type="url"
                value={item.url}
                onChange={(e) => updateKorgItem(item.id, 'url', e.target.value)}
                placeholder="https://drive.google.com/..."
                style={{
                  width: '100%',
                  borderRadius: 10,
                  border: '1px solid rgba(148, 163, 184, 0.45)',
                  background: 'rgba(255, 255, 255, 0.96)',
                  color: '#0f172a',
                  padding: '0.8rem 0.9rem',
                  fontSize: '0.95rem',
                }}
              />
              <button
                type="button"
                className="admin-btn"
                onClick={() => removeKorgItem(item.id)}
                style={{ backgroundColor: '#1e293b', borderColor: '#475569', width: isCompactKorgEditor ? '100%' : 'auto' }}
              >
                Obriši
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="admin-btn" onClick={addKorgItem} style={{ backgroundColor: '#1e293b', borderColor: '#475569' }}>
              Dodaj stavku
            </button>
            <button type="button" className="admin-btn" disabled={savingKorg} onClick={saveKorgDriveLink}>
              {savingKorg ? 'Čuvanje…' : 'Sačuvaj stavke'}
            </button>
            <span style={{ color: data.korgPaItems?.length ? '#4ade80' : '#fbbf24', fontWeight: 700, fontSize: '0.875rem' }}>
              {data.korgPaItems?.length ? `${data.korgPaItems.length} stavki podešeno` : 'Nema podešenih stavki'}
            </span>
          </div>
          {korgMsg ? <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>{korgMsg}</p> : null}
        </div>
      </div>

      <div className="admin-table-wrap" style={{ maxWidth: 560 }}>
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
                    <span style={{ color: '#4ade80', fontWeight: 700 }}>OK</span>
                  ) : (
                    <span style={{ color: '#f87171', fontWeight: 700 }}>Nedostaje</span>
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
