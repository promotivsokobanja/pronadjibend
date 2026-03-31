'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '../../lib/adminFetch';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await adminFetch('/api/admin/stats');
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

  const cards = [
    { label: 'Korisnici', value: data.users },
    { label: 'Bendovi', value: data.bands },
    { label: 'Rezervacije', value: data.bookings },
    { label: 'Na čekanju', value: data.pendingBookings },
    { label: 'Pesme', value: data.songs },
    { label: 'Recenzije', value: data.reviews },
    { label: 'Naplata (događaji)', value: data.billingEvents },
  ];

  return (
    <>
      <h1>Pregled platforme</h1>
      <p className="admin-sub">Brza statistika Pronađi Bend sistema.</p>

      <div className="admin-stats">
        {cards.map((c) => (
          <div key={c.label} className="admin-stat-card">
            <small>{c.label}</small>
            <span>{c.value}</span>
          </div>
        ))}
      </div>

      <div className="admin-table-wrap" style={{ maxWidth: 420 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Uloga</th>
              <th>Broj</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data.byRole || {}).map(([role, n]) => (
              <tr key={role}>
                <td>{role}</td>
                <td>{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
