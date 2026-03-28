'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/adminFetch';

export default function AdminBookingsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [saving, setSaving] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (statusFilter) params.set('status', statusFilter);
      const r = await fetch(`/api/admin/bookings?${params}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška');
      setData(j);
    } catch (e) {
      setError(e.message);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id, status) => {
    setSaving(id);
    setError('');
    try {
      const r = await adminFetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <h1>Rezervacije</h1>
      <p className="admin-sub">Pregled svih upita klijenata ka bendovima.</p>

      <div className="admin-toolbar">
        <label style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          Status:{' '}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ marginLeft: 8 }}
          >
            <option value="">Svi</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </label>
      </div>

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
                  <th>Bend</th>
                  <th>Klijent</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.bookings.map((b) => (
                  <tr key={b.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {new Date(b.date).toLocaleString('sr-RS')}
                    </td>
                    <td>{b.band?.name}</td>
                    <td>{b.clientName}</td>
                    <td style={{ fontSize: '0.8rem' }}>{b.clientEmail}</td>
                    <td>
                      <select
                        value={b.status}
                        disabled={saving === b.id}
                        onChange={(e) => updateStatus(b.id, e.target.value)}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="CANCELLED">CANCELLED</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </td>
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
