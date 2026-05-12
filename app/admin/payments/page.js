'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/adminFetch';

const STATUS_LABELS = {
  PENDING_QR: 'Čeka uplatu',
  CONFIRMED: 'Potvrđeno',
  INVOICE_SENT: 'Račun poslat',
  EXPIRED: 'Isteklo',
};

const STATUS_CLASS = {
  PENDING_QR: 'admin-status admin-status-warn',
  CONFIRMED: 'admin-status admin-status-on',
  INVOICE_SENT: 'admin-status admin-status-on',
  EXPIRED: 'admin-status',
};

export default function AdminPaymentsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmMsg, setConfirmMsg] = useState({});

  const load = useCallback(async () => {
    setError('');
    try {
      const qs = new URLSearchParams({ page, limit: 20 });
      if (filter) qs.set('status', filter);
      const r = await adminFetch(`/api/admin/payments?${qs}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška');
      setData(j);
    } catch (e) {
      setError(e.message);
    }
  }, [page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmPayment = async (paymentId) => {
    if (!window.confirm('Da li ste sigurni da želite da potvrdite ovu uplatu?')) return;
    setConfirmingId(paymentId);
    setConfirmMsg({});
    try {
      const r = await adminFetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška pri potvrdi.');

      const msg = j.invoiceSent
        ? `✅ ${j.payment.plan} aktiviran do ${new Date(j.payment.planUntil).toLocaleDateString('sr-RS')}. Račun ${j.payment.invoiceNumber} poslat.`
        : `⚠️ ${j.payment.plan} aktiviran, ali račun NIJE poslat: ${j.invoiceError || 'nepoznata greška'}. Pošaljite ručno.`;

      setConfirmMsg({ [paymentId]: msg });
      load();
    } catch (e) {
      setConfirmMsg({ [paymentId]: `❌ ${e.message}` });
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <>
      <h1>Uplate</h1>
      <p className="admin-sub">
        Evidencija svih uplata (IPS QR i ručno bankarstvo). Potvrdite kad novac legne na račun.
      </p>

      <div className="admin-toolbar">
        <select
          className="admin-input"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
          style={{ minWidth: 160 }}
        >
          <option value="">Svi statusi</option>
          <option value="PENDING_QR">Čeka uplatu</option>
          <option value="CONFIRMED">Potvrđeno</option>
          <option value="INVOICE_SENT">Račun poslat</option>
          <option value="EXPIRED">Isteklo</option>
        </select>
      </div>

      {error && <p style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</p>}

      {!data ? (
        <p style={{ color: '#94a3b8' }}>Učitavanje…</p>
      ) : data.payments.length === 0 ? (
        <p style={{ color: '#64748b' }}>Nema uplata za prikaz.</p>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Korisnik</th>
                  <th>Plan</th>
                  <th>Iznos</th>
                  <th>Poziv na br.</th>
                  <th>Status</th>
                  <th>Akcija</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => {
                  const userName =
                    p.user?.band?.name ||
                    p.user?.musicianProfile?.name ||
                    p.userEmail;
                  return (
                    <tr key={p.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {new Date(p.createdAt).toLocaleString('sr-RS')}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{userName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{p.userEmail}</div>
                      </td>
                      <td>
                        <span
                          className="admin-badge"
                          style={{
                            background:
                              p.plan === 'PREMIUM_VENUE'
                                ? 'rgba(168, 85, 247, 0.2)'
                                : 'rgba(59, 130, 246, 0.2)',
                            color:
                              p.plan === 'PREMIUM_VENUE' ? '#c4b5fd' : '#93c5fd',
                          }}
                        >
                          {p.plan === 'PREMIUM_VENUE' ? 'Venue' : 'Premium'}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontFamily: 'ui-monospace, monospace', fontSize: '0.82rem' }}>
                        {Number(p.amountRsd).toLocaleString('sr-RS')} RSD
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          ({p.amountEur} EUR)
                        </div>
                      </td>
                      <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.82rem' }}>
                        {p.referenceId}
                      </td>
                      <td>
                        <span className={STATUS_CLASS[p.status] || 'admin-status'}>
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                      </td>
                      <td>
                        {p.status === 'PENDING_QR' ? (
                          <button
                            type="button"
                            className="admin-btn"
                            disabled={confirmingId === p.id}
                            onClick={() => confirmPayment(p.id)}
                          >
                            {confirmingId === p.id ? 'Potvrda…' : 'Potvrdi uplatu'}
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {p.invoiceNumber || '—'}
                          </span>
                        )}
                        {confirmMsg[p.id] && (
                          <div
                            style={{
                              marginTop: '0.4rem',
                              fontSize: '0.78rem',
                              color: confirmMsg[p.id].startsWith('✅')
                                ? '#4ade80'
                                : confirmMsg[p.id].startsWith('⚠')
                                  ? '#fbbf24'
                                  : '#f87171',
                              maxWidth: 260,
                              lineHeight: 1.4,
                            }}
                          >
                            {confirmMsg[p.id]}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <button
              type="button"
              className="admin-btn"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
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
              onClick={() => setPage((prev) => prev + 1)}
            >
              →
            </button>
          </div>
        </>
      )}
    </>
  );
}
