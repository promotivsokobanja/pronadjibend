'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/adminFetch';
import { Download, Trash2, CheckCircle, Save, ChevronLeft, ChevronRight, Search } from 'lucide-react';

function roleBadgeClass(role) {
  if (role === 'ADMIN') return 'admin-badge admin-badge-admin';
  if (role === 'BAND') return 'admin-badge admin-badge-band';
  if (role === 'MUSICIAN') return 'admin-badge admin-badge-musician';
  return 'admin-badge admin-badge-client';
}

function SkeletonTable() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="admin-skeleton admin-skeleton-row" style={{ opacity: 1 - i * 0.08 }} />
      ))}
    </div>
  );
}

function ConfirmModal({ title, message, email, onConfirm, onCancel, loading }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}{email && <><br /><strong style={{ color: '#e2e8f0' }}>{email}</strong></>}</p>
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onCancel} disabled={loading}>
            Otkaži
          </button>
          <button type="button" className="admin-btn admin-btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Obrada…' : 'Potvrdi'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      const r = await adminFetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška');
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const verifyUser = async (userId) => {
    setSaving(userId);
    setError('');
    try {
      const r = await adminFetch(`/api/admin/users/${userId}/verify`, { method: 'PATCH' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await adminFetch('/api/admin/users/export');
      if (!r.ok) throw new Error('Greška pri exportu');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `korisnici-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <h1>Korisnici</h1>
      <p className="admin-sub">Pregled naloga, uloga, verifikacije i planova.</p>

      <form className="admin-toolbar" onSubmit={handleSearch}>
        <input
          className="admin-input"
          placeholder="Pretraga po emailu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="admin-btn admin-btn-blue">
          <Search size={14} /> Pretraži
        </button>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={exportCsv} disabled={exporting}>
          <Download size={14} /> {exporting ? 'Export…' : 'Izvezi CSV'}
        </button>
      </form>

      {error && <p style={{ color: '#f87171', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>{error}</p>}

      {!data ? (
        <SkeletonTable />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Uloga</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Bend / Muzičar</th>
                  <th>Registrovan</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <UserRow
                    key={u.id}
                    u={u}
                    saving={saving === u.id}
                    onSave={saveUser}
                    onDelete={(user) => setDeleteTarget(user)}
                    onVerify={verifyUser}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Strana {data.page} / {data.pages} <span style={{ color: '#52525b' }}>({data.total})</span>
            </span>
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Deaktivacija korisnika"
          message="Da li ste sigurni da želite da deaktivirate ovaj nalog? Korisnik neće moći da se prijavi, ali podaci ostaju sačuvani."
          email={deleteTarget.email}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </>
  );
}

function UserRow({ u, saving, onSave, onDelete, onVerify }) {
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

  const isDeactivated = !!u.deletedAt;
  const nameDisplay = u.band?.name || (u.musicianProfile?.name
    ? `${u.musicianProfile.name}${u.musicianProfile.primaryInstrument ? ` (${u.musicianProfile.primaryInstrument})` : ''}`
    : '—');

  return (
    <tr style={isDeactivated ? { opacity: 0.5 } : undefined}>
      <td style={{ maxWidth: 220, wordBreak: 'break-all' }}>
        <span style={{ fontSize: '0.84rem', color: '#e4e4e7' }}>{u.email}</span>
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={roleBadgeClass(u.role)}>{u.role}</span>
          {!isDeactivated && (
            <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{ maxWidth: 100 }}>
              <option value="CLIENT">CLIENT</option>
              <option value="BAND">BAND</option>
              <option value="MUSICIAN">MUSICIAN</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          )}
        </div>
      </td>
      <td>
        {isDeactivated ? (
          <span className="admin-badge admin-badge-deactivated">Deaktiviran</span>
        ) : u.emailVerified ? (
          <span className="admin-badge admin-badge-verified">Verifikovan</span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="admin-badge admin-badge-unverified">Čeka</span>
            <button
              type="button"
              className="admin-icon-btn admin-icon-btn-success"
              title="Verifikuj ručno"
              disabled={saving}
              onClick={() => onVerify(u.id)}
            >
              <CheckCircle size={14} />
            </button>
          </div>
        )}
      </td>
      <td>
        {!isDeactivated ? (
          <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)}>
            {!['BASIC', 'PREMIUM', 'PREMIUM_VENUE'].includes(editPlan) && (
              <option value={editPlan}>{editPlan}</option>
            )}
            <option value="BASIC">BASIC</option>
            <option value="PREMIUM">PREMIUM</option>
            <option value="PREMIUM_VENUE">PREMIUM_VENUE</option>
          </select>
        ) : (
          <span style={{ color: '#52525b', fontSize: '0.82rem' }}>{u.plan}</span>
        )}
      </td>
      <td style={{ fontSize: '0.82rem', color: '#a1a1aa' }}>{nameDisplay}</td>
      <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', color: '#71717a' }}>
        {new Date(u.createdAt).toLocaleString('sr-RS')}
      </td>
      <td>
        {!isDeactivated && (
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              type="button"
              className="admin-icon-btn"
              title="Sačuvaj izmene"
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
              <Save size={14} />
            </button>
            <button
              type="button"
              className="admin-icon-btn admin-icon-btn-danger"
              title="Deaktiviraj"
              disabled={saving}
              onClick={() => onDelete(u)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
