'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/adminFetch';
import AdminPaidToggle from '@/components/admin/AdminPaidToggle';

export default function AdminBandsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(
    async (pageNum = page, q = search) => {
      setError('');
      try {
        const params = new URLSearchParams({ page: String(pageNum), limit: '20' });
        if (q.trim()) params.set('search', q.trim());
        const r = await adminFetch(`/api/admin/bands?${params}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Greška');
        setData(j);
      } catch (e) {
        setError(e.message);
      }
    },
    [page, search]
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1, search);
  };

  return (
    <>
      <h1>Bendovi</h1>
      <p className="admin-sub">Svi registrovani bend profili.</p>

      <form className="admin-toolbar" onSubmit={handleSearch}>
        <input
          className="admin-input"
          placeholder="Pretraga (naziv, lokacija, žanr)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="admin-btn">
          Pretraži
        </button>
      </form>

      {error && <p style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</p>}

      {!data ? (
        <p style={{ color: '#94a3b8' }}>Učitavanje…</p>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Naziv</th>
                  <th>Lokacija</th>
                  <th>Žanr</th>
                  <th>Ocena</th>
                  <th>Nalog</th>
                  <th>Pesme</th>
                  <th>Upiti</th>
                </tr>
              </thead>
              <tbody>
                {data.bands.map((b) => (
                  <tr key={b.id}>
                    <td>
                      {b.name}
                      <AdminPaidToggle bandId={b.id} isPaid={b.isPaid} onUpdated={() => load()} />
                    </td>
                    <td>{b.location}</td>
                    <td>{b.genre}</td>
                    <td>{b.rating?.toFixed(1) ?? '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{b.user?.email || '—'}</td>
                    <td>{b._count?.songs ?? 0}</td>
                    <td>{b._count?.bookings ?? 0}</td>
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
