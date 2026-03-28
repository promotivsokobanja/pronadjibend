'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/adminFetch';

export default function AdminSystemPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await adminFetch('/api/admin/system');
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Greška');
        setData(j);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

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
        Provera da li su ključni servisi podešeni (bez prikaza tajni). Vrednosti menjate u Netlify
        Environment variables ili .env lokalno.
      </p>

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
