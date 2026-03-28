'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/adminFetch';

export default function AdminReviewsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await fetch(`/api/admin/reviews?page=${page}&limit=25`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška');
      setData(j);
    } catch (e) {
      setError(e.message);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id) => {
    if (!confirm('Obrisati ovu recenziju?')) return;
    setDeleting(id);
    setError('');
    try {
      const r = await adminFetch(`/api/admin/reviews?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <h1>Recenzije</h1>
      <p className="admin-sub">Moderacija komentara na bend profile.</p>

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
                  <th>Autor</th>
                  <th>Ocena</th>
                  <th>Komentar</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.reviews.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {new Date(r.createdAt).toLocaleString('sr-RS')}
                    </td>
                    <td>{r.band?.name}</td>
                    <td>{r.author}</td>
                    <td>{r.rating}</td>
                    <td style={{ maxWidth: 280, fontSize: '0.8rem' }}>
                      {r.comment || '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        disabled={deleting === r.id}
                        onClick={() => remove(r.id)}
                      >
                        {deleting === r.id ? '…' : 'Obriši'}
                      </button>
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
