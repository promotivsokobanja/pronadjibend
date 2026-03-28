'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/adminFetch';

const CATEGORIES = ['Sve', 'Zabavne', 'Narodne', 'Strane'];
const CATEGORY_OPTIONS = ['', 'Zabavne', 'Narodne', 'Strane'];

const modalBackdrop = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.85)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '1.5rem',
  overflowY: 'auto',
};

const modalBox = {
  width: '100%',
  maxWidth: 640,
  marginTop: '2rem',
  marginBottom: '2rem',
  background: '#1e293b',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: 12,
  padding: '1.25rem 1.5rem',
  color: '#e2e8f0',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#94a3b8',
  marginBottom: '0.35rem',
};

const fieldStyle = {
  width: '100%',
  background: '#0f172a',
  border: '1px solid rgba(148, 163, 184, 0.25)',
  color: '#e2e8f0',
  borderRadius: 8,
  padding: '0.5rem 0.65rem',
  fontSize: '0.875rem',
  marginBottom: '0.85rem',
  boxSizing: 'border-box',
};

const textareaStyle = {
  ...fieldStyle,
  minHeight: 220,
  resize: 'vertical',
  fontFamily: 'ui-monospace, monospace',
  lineHeight: 1.45,
};

function emptyForm() {
  return {
    title: '',
    artist: '',
    lyrics: '',
    chords: '',
    key: '',
    category: 'Zabavne',
    type: '',
  };
}

export default function AdminPesmaricaPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Sve');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadingSong, setLoadingSong] = useState(false);

  const load = useCallback(
    async (opts = {}) => {
      const pageNum = opts.page ?? page;
      const searchVal = opts.search !== undefined ? opts.search : search;
      const catVal = opts.category !== undefined ? opts.category : category;
      setError('');
      try {
        const qs = new URLSearchParams({ page: String(pageNum), limit: '25' });
        const q = String(searchVal).trim();
        if (q.length >= 2) qs.set('search', q);
        if (catVal !== 'Sve') qs.set('category', catVal);
        const r = await adminFetch(`/api/admin/pesmarica?${qs}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Greška');
        setData(j);
      } catch (e) {
        setError(e.message);
      }
    },
    [page, search, category]
  );

  useEffect(() => {
    load({});
  }, [page, category, load]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
    setError('');
  };

  const openEdit = async (id) => {
    setEditingId(id);
    setModalOpen(true);
    setLoadingSong(true);
    setError('');
    try {
      const r = await adminFetch(`/api/admin/pesmarica/${id}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Greška');
      const s = j.song;
      setForm({
        title: s.title || '',
        artist: s.artist || '',
        lyrics: s.lyrics || '',
        chords: s.chords || '',
        key: s.key || '',
        category: s.category || 'Zabavne',
        type: s.type || '',
      });
    } catch (e) {
      setError(e.message);
      setModalOpen(false);
    } finally {
      setLoadingSong(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load({ page: 1, search, category });
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };

  const onLyricsFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, lyrics: String(reader.result || '') }));
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const saveSong = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        artist: form.artist.trim(),
        lyrics: form.lyrics,
        chords: form.chords.trim() || null,
        key: form.key.trim() || null,
        category: form.category.trim() || null,
        type: form.type.trim() || null,
      };

      if (editingId) {
        const r = await adminFetch(`/api/admin/pesmarica/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Greška');
      } else {
        const r = await adminFetch('/api/admin/pesmarica', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Greška');
      }
      closeModal();
      await load({});
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteSong = async (id, title) => {
    if (!window.confirm(`Obrisati pesmu iz kataloga?\n\n${title}`)) return;
    setError('');
    try {
      const r = await adminFetch(`/api/admin/pesmarica/${id}`, { method: 'DELETE' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Greška');
      await load({});
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <h1>Pesmarica</h1>
      <p className="admin-sub">
        Globalni katalog pesama za bendove (bez bend ID-a). Tekst je obavezan da bi se pesma pojavila na stranici Pesmarica.
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
            style={{ minWidth: 140 }}
            value={category}
            onChange={handleCategoryChange}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === 'Sve' ? 'Sve kategorije' : c}
              </option>
            ))}
          </select>
          <button type="submit" className="admin-btn">
            Pretraži
          </button>
        </form>
        <button type="button" className="admin-btn" onClick={openNew}>
          + Nova pesma
        </button>
      </div>

      {error && !modalOpen && (
        <p style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</p>
      )}

      {!data ? (
        <p style={{ color: '#94a3b8' }}>Učitavanje…</p>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Naslov</th>
                  <th>Izvođač</th>
                  <th>Kategorija</th>
                  <th>Tekst</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.songs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ color: '#94a3b8' }}>
                      Nema rezultata.
                    </td>
                  </tr>
                ) : (
                  data.songs.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700, maxWidth: 200 }}>{s.title}</td>
                      <td style={{ maxWidth: 160 }}>{s.artist}</td>
                      <td>{s.category || '—'}</td>
                      <td style={{ fontSize: '0.78rem', color: '#94a3b8', maxWidth: 280 }}>
                        {s.hasLyrics ? (
                          <>
                            <span className="admin-badge admin-badge-client" style={{ marginRight: 6 }}>
                              Da
                            </span>
                            {s.lyricsPreview}
                          </>
                        ) : (
                          <span className="admin-badge" style={{ background: 'rgba(248,113,113,0.15)', color: '#fca5a5' }}>
                            Nema
                          </span>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="admin-btn" onClick={() => openEdit(s.id)}>
                          Izmeni
                        </button>{' '}
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          onClick={() => deleteSong(s.id, s.title)}
                        >
                          Obriši
                        </button>
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

      {modalOpen && (
        <div
          style={modalBackdrop}
          role="presentation"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) closeModal();
          }}
        >
          <div style={modalBox} role="dialog" aria-labelledby="pesmarica-form-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="pesmarica-form-title" style={{ margin: '0 0 1rem', fontSize: '1.15rem' }}>
              {editingId ? 'Izmeni pesmu' : 'Nova pesma u pesmarici'}
            </h2>

            {loadingSong ? (
              <p style={{ color: '#94a3b8' }}>Učitavanje…</p>
            ) : (
              <form onSubmit={saveSong}>
                {error && (
                  <p style={{ color: '#f87171', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{error}</p>
                )}

                <label style={labelStyle}>Naslov</label>
                <input
                  required
                  style={fieldStyle}
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />

                <label style={labelStyle}>Izvođač</label>
                <input
                  required
                  style={fieldStyle}
                  value={form.artist}
                  onChange={(e) => setForm((f) => ({ ...f, artist: e.target.value }))}
                />

                <label style={labelStyle}>Kategorija</label>
                <select
                  style={fieldStyle}
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c || 'none'} value={c}>
                      {c || '— (bez)'}
                    </option>
                  ))}
                </select>

                <label style={labelStyle}>Tip / žanr (opciono)</label>
                <input
                  style={fieldStyle}
                  placeholder="npr. Zabavna, Narodna"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                />

                <label style={labelStyle}>Ton (ključ)</label>
                <input
                  style={fieldStyle}
                  placeholder="npr. C, Am"
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                />

                <label style={labelStyle}>Akordi (opciono)</label>
                <textarea
                  style={{ ...textareaStyle, minHeight: 100 }}
                  value={form.chords}
                  onChange={(e) => setForm((f) => ({ ...f, chords: e.target.value }))}
                />

                <label style={labelStyle}>Tekst pesme</label>
                <textarea
                  required={!editingId}
                  style={textareaStyle}
                  value={form.lyrics}
                  onChange={(e) => setForm((f) => ({ ...f, lyrics: e.target.value }))}
                  placeholder="Unesite stihove ili učitajte .txt fajl ispod."
                />

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>Učitaj tekst iz fajla</label>
                  <input type="file" accept=".txt,text/plain" onChange={onLyricsFile} style={{ fontSize: '0.8rem', color: '#94a3b8' }} />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button type="submit" className="admin-btn" disabled={saving}>
                    {saving ? 'Čuvanje…' : 'Sačuvaj'}
                  </button>
                  <button type="button" className="admin-btn" style={{ background: '#475569' }} onClick={closeModal}>
                    Otkaži
                  </button>
                </div>
                {!editingId && (
                  <p style={{ marginTop: '0.85rem', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
                    Nova pesma mora imati tekst da bi bila vidljiva bendovima u javnoj pesmarici.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
