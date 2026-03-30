'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../../lib/adminFetch';

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'DUPLICATE', 'SVE'];

export default function AdminPesmaricaSubmissionsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mutatingId, setMutatingId] = useState('');

  const load = useCallback(
    async (opts = {}) => {
      const pageNum = opts.page ?? page;
      const statusValue = opts.status ?? status;
      const searchValue = opts.search ?? search;

      setError('');
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          page: String(pageNum),
          limit: '20',
          status: statusValue,
        });

        const q = String(searchValue || '').trim();
        if (q.length >= 2) qs.set('search', q);

        const resp = await adminFetch(`/api/admin/pesmarica/submissions?${qs.toString()}`);
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(json.error || 'Greška pri učitavanju predloga.');
        setData(json);
      } catch (err) {
        setError(err.message || 'Greška pri učitavanju predloga.');
      } finally {
        setLoading(false);
      }
    },
    [page, search, status]
  );

  useEffect(() => {
    load({});
  }, [page, status, load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load({ page: 1, search });
  };

  const runAction = async (id, action) => {
    if (!id) return;
    const reason =
      action === 'reject'
        ? window.prompt('Razlog odbijanja (opciono):', '') || ''
        : window.prompt('Napomena (opciono):', '') || '';

    setMutatingId(id);
    setError('');
    try {
      const resp = await adminFetch(`/api/admin/pesmarica/submissions/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json.error || 'Akcija nije uspela.');
      await load({});
    } catch (err) {
      setError(err.message || 'Akcija nije uspela.');
    } finally {
      setMutatingId('');
    }
  };

  return (
    <>
      <h1>Predlozi pesama</h1>
      <p className="admin-sub">
        Pesme koje su bendovi dodali u svoj portal automatski se prikazuju ovde za odobrenje u javnu pesmaricu.
      </p>

      <div className="admin-toolbar">
        <form onSubmit={handleSearch} className="admin-toolbar" style={{ flex: 1, marginBottom: 0 }}>
          <input
            className="admin-input"
            placeholder="Pretraga (min. 2 znaka)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="admin-input"
            style={{ minWidth: 170 }}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'SVE' ? 'Svi statusi' : s}
              </option>
            ))}
          </select>
          <button type="submit" className="admin-btn">
            Pretraži
          </button>
        </form>
      </div>

      {error ? <p style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</p> : null}

      {!data || loading ? (
        <p style={{ color: '#94a3b8' }}>Učitavanje…</p>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Naslov</th>
                  <th>Izvođač</th>
                  <th>Status</th>
                  <th>Bend</th>
                  <th>Kategorija</th>
                  <th>Kreirano</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.submissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ color: '#94a3b8' }}>
                      Nema rezultata.
                    </td>
                  </tr>
                ) : (
                  data.submissions.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700, maxWidth: 240 }}>{s.title}</td>
                      <td style={{ maxWidth: 180 }}>{s.artist}</td>
                      <td>{s.status}</td>
                      <td>{s.submittedByBandName || '—'}</td>
                      <td>{s.category || '—'}</td>
                      <td>{new Date(s.createdAt).toLocaleString('sr-Latn-RS')}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {s.status === 'PENDING' ? (
                          <>
                            <button
                              type="button"
                              className="admin-btn"
                              disabled={mutatingId === s.id}
                              onClick={() => runAction(s.id, 'approve')}
                            >
                              Odobri
                            </button>{' '}
                            <button
                              type="button"
                              className="admin-btn admin-btn-danger"
                              disabled={mutatingId === s.id}
                              onClick={() => runAction(s.id, 'reject')}
                            >
                              Odbij
                            </button>
                          </>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Obrađeno</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
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
