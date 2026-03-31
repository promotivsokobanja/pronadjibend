'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/adminFetch';

export default function AdminBillingPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      setError('');
      try {
        const r = await adminFetch(`/api/admin/billing?page=${page}&limit=30`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Greška');
        setData(j);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [page]);

  return (
    <>
      <h1>Naplate (Stripe)</h1>
      <p className="admin-sub">Događaji iz tabele BillingEvent (sesije, statusi).</p>

      {error && <p style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</p>}

      {!data ? (
        <p style={{ color: '#94a3b8' }}>Učitavanje…</p>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Status</th>
                  <th>Email</th>
                  <th>Session ID</th>
                  <th>Customer</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((ev) => (
                  <tr key={ev.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {new Date(ev.createdAt).toLocaleString('sr-RS')}
                    </td>
                    <td>{ev.status}</td>
                    <td style={{ fontSize: '0.8rem' }}>{ev.customerEmail || '—'}</td>
                    <td style={{ fontSize: '0.72rem', maxWidth: 160, fontFamily: 'ui-monospace, monospace' }}>
                      {ev.stripeSessionId || '—'}
                    </td>
                    <td style={{ fontSize: '0.72rem' }}>{ev.stripeCustomerId || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <button
              type="button"
              className="admin-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ←
            </button>
            <span>
              Strana {data.page} / {data.pages} ({data.total} ukupno)
            </span>
            <button
              type="button"
              className="admin-btn"
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </button>
          </div>
        </>
      )}
    </>
  );
}
