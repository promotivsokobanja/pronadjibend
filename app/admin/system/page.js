'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/adminFetch';

export default function AdminSystemPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [savingDemo, setSavingDemo] = useState(false);
  const [demoMsg, setDemoMsg] = useState('');
  const [savingLimits, setSavingLimits] = useState(false);
  const [limitsMsg, setLimitsMsg] = useState('');
  const [limitsForm, setLimitsForm] = useState({ maxImages: 1, maxVideos: 1, maxLinks: 5 });

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await adminFetch('/api/admin/system');
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška');
      setData(j);
      setLimitsForm({
        maxImages: Number(j?.bandProfileMediaLimits?.maxImages ?? 1),
        maxVideos: Number(j?.bandProfileMediaLimits?.maxVideos ?? 1),
        maxLinks: Number(j?.bandProfileMediaLimits?.maxLinks ?? 5),
      });
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

  const handleLimitInput = (key, value) => {
    setLimitsForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveMediaLimits = async () => {
    setSavingLimits(true);
    setLimitsMsg('');
    try {
      const payload = {
        bandProfileMediaLimits: {
          maxImages: Number(limitsForm.maxImages),
          maxVideos: Number(limitsForm.maxVideos),
          maxLinks: Number(limitsForm.maxLinks),
        },
      };

      const r = await adminFetch('/api/admin/system/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška pri čuvanju');

      setData((prev) =>
        prev
          ? {
              ...prev,
              bandProfileMediaLimits: j.bandProfileMediaLimits,
            }
          : prev
      );
      setLimitsForm({
        maxImages: Number(j?.bandProfileMediaLimits?.maxImages ?? 1),
        maxVideos: Number(j?.bandProfileMediaLimits?.maxVideos ?? 1),
        maxLinks: Number(j?.bandProfileMediaLimits?.maxLinks ?? 5),
      });
      setLimitsMsg('Media limiti su sačuvani.');
    } catch (e) {
      setLimitsMsg(e.message);
    } finally {
      setSavingLimits(false);
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
        <h2 style={{ fontSize: '1rem', margin: '0 0 0.5rem', fontWeight: 800 }}>Moj profil benda — media limiti</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Odredite koliko je priloga dozvoljeno na profilu benda. Trenutni model podržava najviše 1 glavnu sliku, 1
          video i više linkova u opisu.
        </p>

        <div style={{ display: 'grid', gap: '0.8rem' }}>
          <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.85rem' }}>
            Maksimalan broj slika (0-1)
            <input
              type="number"
              min={0}
              max={1}
              value={limitsForm.maxImages}
              onChange={(e) => handleLimitInput('maxImages', e.target.value)}
              style={{
                borderRadius: 8,
                border: '1px solid rgba(148, 163, 184, 0.5)',
                background: 'rgba(15, 23, 42, 0.35)',
                color: '#e2e8f0',
                padding: '0.55rem 0.65rem',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.85rem' }}>
            Maksimalan broj videa (0-1)
            <input
              type="number"
              min={0}
              max={1}
              value={limitsForm.maxVideos}
              onChange={(e) => handleLimitInput('maxVideos', e.target.value)}
              style={{
                borderRadius: 8,
                border: '1px solid rgba(148, 163, 184, 0.5)',
                background: 'rgba(15, 23, 42, 0.35)',
                color: '#e2e8f0',
                padding: '0.55rem 0.65rem',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.85rem' }}>
            Maksimalan broj linkova u opisu (0-30)
            <input
              type="number"
              min={0}
              max={30}
              value={limitsForm.maxLinks}
              onChange={(e) => handleLimitInput('maxLinks', e.target.value)}
              style={{
                borderRadius: 8,
                border: '1px solid rgba(148, 163, 184, 0.5)',
                background: 'rgba(15, 23, 42, 0.35)',
                color: '#e2e8f0',
                padding: '0.55rem 0.65rem',
              }}
            />
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <button type="button" className="admin-btn" disabled={savingLimits} onClick={saveMediaLimits}>
              {savingLimits ? 'Čuvanje…' : 'Sačuvaj media limite'}
            </button>
            {limitsMsg ? <span style={{ fontSize: '0.84rem', color: '#94a3b8' }}>{limitsMsg}</span> : null}
          </div>
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
