'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';

export default function AdminPaidToggle({ bandId, isPaid: initialPaid, onUpdated }) {
  const [isPaid, setIsPaid] = useState(Boolean(initialPaid));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setIsPaid(Boolean(initialPaid));
  }, [initialPaid, bandId]);

  const toggle = async () => {
    setLoading(true);
    setErr('');
    try {
      const r = await adminFetch(`/api/admin/bands/${bandId}/paid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid: !isPaid }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška');
      setIsPaid(Boolean(j.isPaid));
      onUpdated?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: '10px' }}>
      <button
        type="button"
        className="admin-btn"
        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
        onClick={toggle}
        disabled={loading}
      >
        {loading ? '…' : isPaid ? 'PRO' : 'FREE'}
      </button>
      {err ? (
        <span style={{ color: '#f87171', fontSize: '0.75rem' }} title={err}>
          Greška
        </span>
      ) : null}
    </span>
  );
}
