'use client';

import { useCallback, useEffect, useState } from 'react';
import ChatThread from '@/components/ChatThread';
import { adminFetch } from '@/lib/adminFetch';

const STATUSES = ['', 'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'];

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('sr-RS');
}

export default function AdminMusicianInvitesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [premiumOnly, setPremiumOnly] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' });
      if (statusFilter) params.set('status', statusFilter);
      const r = await adminFetch(`/api/admin/musician-invites?${params}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška');
      setData(j);
    } catch (e) {
      setError(e.message || 'Greška pri učitavanju.');
    }
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const invitesList = Array.isArray(data?.invites) ? data.invites : [];
  const visibleInvites = premiumOnly
    ? invitesList.filter((invite) => invite.premiumChatEnabled)
    : invitesList;

  return (
    <>
      <h1>Pozivi muzičarima (chat)</h1>
      <p className="admin-sub">Admin pregled poziva i komunikacije bend ↔ muzičar.</p>

      <div className="admin-toolbar" style={{ marginBottom: '1rem' }}>
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
            {STATUSES.map((s) => (
              <option key={s || 'all'} value={s}>
                {s || 'Svi'}
              </option>
            ))}
          </select>
        </label>
        <label style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: '1rem' }}>
          <input
            type="checkbox"
            checked={premiumOnly}
            onChange={(e) => setPremiumOnly(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          Samo aktivan Premium chat
        </label>
      </div>

      {error && <p style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</p>}

      {!data ? (
        <p style={{ color: '#94a3b8' }}>Učitavanje…</p>
      ) : visibleInvites.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>
          {premiumOnly
            ? 'Nema poziva sa aktivnim Premium chat-om za izabrani filter.'
            : 'Nema poziva za izabrani filter.'}
        </p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {visibleInvites.map((invite) => (
            <section key={invite.id} className="admin-table-wrap" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, color: '#e2e8f0', fontWeight: 700 }}>
                    Bend: {invite.band?.name || '—'}
                  </p>
                  <p style={{ margin: '0.2rem 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                    Muzičar: {invite.musician?.name || '—'}
                    {invite.musician?.primaryInstrument ? ` • ${invite.musician.primaryInstrument}` : ''}
                    {invite.musician?.city ? ` • ${invite.musician.city}` : ''}
                  </p>
                  <p style={{ margin: '0.2rem 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>
                    Kreirano: {formatDate(invite.createdAt)}
                    {invite.eventDate ? ` • Termin: ${formatDate(invite.eventDate)}` : ''}
                  </p>
                  {invite.message ? (
                    <p style={{ margin: '0.45rem 0 0', color: '#cbd5e1', fontSize: '0.84rem', whiteSpace: 'pre-wrap' }}>
                      {invite.message}
                    </p>
                  ) : null}
                  <p style={{ margin: '0.45rem 0 0', color: '#94a3b8', fontSize: '0.78rem' }}>
                    Premium chat: {invite.premiumChatEnabled ? 'DA' : 'NE'}
                  </p>
                </div>
                <span className={`invite-status-pill invite-status-${String(invite.status || '').toLowerCase()}`}>
                  {invite.status || '—'}
                </span>
              </div>
              {invite.premiumChatEnabled ? (
                <ChatThread inviteId={invite.id} />
              ) : (
                <div
                  style={{
                    marginTop: '0.8rem',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '10px',
                    padding: '0.7rem 0.85rem',
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    background: 'rgba(15, 23, 42, 0.2)',
                  }}
                >
                  🔒 Chat je zaključan: oba naloga moraju biti Premium.
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {data && data.pages > 1 ? (
        <div className="admin-pagination" style={{ marginTop: '1rem' }}>
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
      ) : null}
    </>
  );
}
