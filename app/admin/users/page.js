'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/adminFetch';

function roleBadgeClass(role) {
  if (role === 'ADMIN') return 'admin-badge admin-badge-admin';
  if (role === 'BAND') return 'admin-badge admin-badge-band';
  return 'admin-badge admin-badge-client';
}

export default function AdminUsersPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(null);

  const load = useCallback(async (pageNum = page, searchVal = search) => {
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(pageNum), limit: '20' });
      if (searchVal.trim()) qs.set('search', searchVal.trim());
      const r = await adminFetch(`/api/admin/users?${qs}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška');
      setData(j);
    } catch (e) {
      setError(e.message);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1, search);
  };

  const saveUser = async (user) => {
    setSaving(user.id);
    setError('');
    try {
      const r = await adminFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          role: user._editRole,
          plan: user._editPlan,
          planUntil: user._editPlanUntil || null,
        }),
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
      <h1>Korisnici</h1>
      <p className="admin-sub">Pregled naloga, uloga i planova.</p>

      <form className="admin-toolbar" onSubmit={handleSearch}>
        <input
          className="admin-input"
          placeholder="Pretraga po emailu…"
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
                  <th>Email</th>
                  <th>Uloga</th>
                  <th>Plan</th>
                  <th>Bend</th>
                  <th>Registrovan</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <UserRow
                    key={u.id}
                    u={u}
                    saving={saving === u.id}
                    onSave={saveUser}
                    roleBadgeClass={roleBadgeClass}
                  />
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

function UserRow({ u, saving, onSave, roleBadgeClass }) {
  const [editRole, setEditRole] = useState(u.role);
  const [editPlan, setEditPlan] = useState(u.plan);
  const [editUntil, setEditUntil] = useState(
    u.planUntil ? new Date(u.planUntil).toISOString().slice(0, 10) : ''
  );

  useEffect(() => {
    setEditRole(u.role);
    setEditPlan(u.plan);
    setEditUntil(u.planUntil ? new Date(u.planUntil).toISOString().slice(0, 10) : '');
  }, [u.id, u.role, u.plan, u.planUntil]);

  return (
    <tr>
      <td style={{ maxWidth: 220 }}>{u.email}</td>
      <td>
        <span className={roleBadgeClass(u.role)}>{u.role}</span>
        <select
          value={editRole}
          onChange={(e) => setEditRole(e.target.value)}
          style={{ marginLeft: 8, maxWidth: 110 }}
        >
          <option value="CLIENT">CLIENT</option>
          <option value="BAND">BAND</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </td>
      <td>
        <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)}>
          {!['BASIC', 'PREMIUM', 'PREMIUM_VENUE'].includes(editPlan) && (
            <option value={editPlan}>{editPlan}</option>
          )}
          <option value="BASIC">BASIC</option>
          <option value="PREMIUM">PREMIUM</option>
          <option value="PREMIUM_VENUE">PREMIUM_VENUE</option>
        </select>
      </td>
      <td>{u.band?.name || '—'}</td>
      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
        {new Date(u.createdAt).toLocaleString('sr-RS')}
      </td>
      <td>
        <button
          type="button"
          className="admin-btn"
          disabled={saving}
          onClick={() =>
            onSave({
              ...u,
              _editRole: editRole,
              _editPlan: editPlan,
              _editPlanUntil: editUntil || null,
            })
          }
        >
          {saving ? '…' : 'Sačuvaj'}
        </button>
      </td>
    </tr>
  );
}
