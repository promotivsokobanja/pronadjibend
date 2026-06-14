'use client';

import { useState, useEffect, useRef } from 'react';
import { adminFetch } from '../../../lib/adminFetch';
import { Trash2, Plus, ExternalLink, Music } from 'lucide-react';

const CATEGORIES = ['Zabavna', 'Narodna', 'Pop', 'Rock', 'Kola', 'Balada', 'Ostalo'];

export default function AdminDemoSongsPage() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '', artist: '', category: 'Zabavna', description: '', driveLink: '', price: '', allowDownload: false,
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const fetchSongs = async () => {
    try {
      const r = await adminFetch('/api/admin/demo-songs');
      const data = await r.json();
      if (r.ok) setSongs(data);
      else setError(data.error || 'Greška');
    } catch { setError('Greška pri učitavanju.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSongs(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('artist', formData.artist);
      fd.append('category', formData.category);
      fd.append('description', formData.description);
      fd.append('driveLink', formData.driveLink);
      fd.append('price', formData.price);
      fd.append('allowDownload', formData.allowDownload ? 'true' : 'false');
      if (file) fd.append('file', file);

      const r = await adminFetch('/api/admin/demo-songs', {
        method: 'POST',
        body: fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Greška');
      setSongs((prev) => [data, ...prev]);
      setShowForm(false);
      setFormData({ title: '', artist: '', category: 'Zabavna', description: '', driveLink: '', price: '', allowDownload: false });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Obrisati demo pesmu?')) return;
    try {
      const r = await adminFetch(`/api/admin/demo-songs?id=${id}`, { method: 'DELETE' });
      if (r.ok) setSongs((prev) => prev.filter((s) => s.id !== id));
      else { const d = await r.json(); alert(d.error || 'Greška'); }
    } catch { alert('Greška pri brisanju.'); }
  };

  const toggleActive = async (id, currentActive) => {
    try {
      const r = await adminFetch('/api/admin/demo-songs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });
      if (r.ok) {
        const updated = await r.json();
        setSongs((prev) => prev.map((s) => s.id === id ? updated : s));
      }
    } catch { /* ignore */ }
  };

  const toggleDownload = async (id, current) => {
    try {
      const r = await adminFetch('/api/admin/demo-songs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, allowDownload: !current }),
      });
      if (r.ok) {
        const updated = await r.json();
        setSongs((prev) => prev.map((s) => s.id === id ? updated : s));
      }
    } catch { /* ignore */ }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1>Demo Pesme</h1>
        <button
          className="admin-btn"
          onClick={() => setShowForm(!showForm)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} /> Nova demo pesma
        </button>
      </div>

      {error && <p style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="admin-form-card" style={{ marginBottom: '2rem' }}>
          <div className="admin-form-grid">
            <div>
              <label>Naziv pesme *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label>Izvođač *</label>
              <input
                type="text"
                value={formData.artist}
                onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                required
              />
            </div>
            <div>
              <label>Kategorija</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label>Cena</label>
              <input
                type="text"
                placeholder="npr. 2000 RSD"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label>Google Drive link (matrica za skidanje)</label>
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={formData.driveLink}
                onChange={(e) => setFormData({ ...formData, driveLink: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label>Opis (opciono)</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label>MP3 demo fajl (preview za preslušavanje — gost čuje ~25%)</label>
              <input
                ref={fileRef}
                type="file"
                accept=".mp3,.wav,.ogg,.m4a,.aac"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="checkbox"
                id="allowDownload"
                checked={formData.allowDownload || false}
                onChange={(e) => setFormData({ ...formData, allowDownload: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: '#6366f1' }}
              />
              <label htmlFor="allowDownload" style={{ margin: 0, textTransform: 'none', fontSize: '0.88rem', color: '#e2e8f0' }}>
                Dozvoli preuzimanje matrice (samo PREMIUM korisnici)
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="submit" className="admin-btn" disabled={uploading}>
              {uploading ? 'Dodajem…' : 'Dodaj demo pesmu'}
            </button>
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setShowForm(false)}>
              Otkaži
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Učitavanje…</p>
      ) : songs.length === 0 ? (
        <p style={{ color: '#64748b' }}>Nema demo pesama. Kliknite „Nova demo pesma" da dodate prvu.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Pesma</th>
                <th>Kategorija</th>
                <th>Cena</th>
                <th>Preview</th>
                <th>Drive</th>
                <th>Preuzimanje</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {songs.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.title}</strong><br />
                    <small style={{ color: '#94a3b8' }}>{s.artist}</small>
                  </td>
                  <td>{s.category || '—'}</td>
                  <td>{s.price || '—'}</td>
                  <td>{s.previewPath ? <Music size={14} style={{ color: '#4ade80' }} /> : '—'}</td>
                  <td>
                    {s.driveLink ? (
                      <a href={s.driveLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={14} />
                      </a>
                    ) : '—'}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => toggleDownload(s.id, s.allowDownload)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: s.allowDownload ? '#4ade80' : '#f87171',
                        fontWeight: 700, fontSize: '0.8rem',
                      }}
                    >
                      {s.allowDownload ? 'DA' : 'NE'}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => toggleActive(s.id, s.isActive)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: s.isActive ? '#4ade80' : '#f87171',
                        fontWeight: 700, fontSize: '0.8rem',
                      }}
                    >
                      {s.isActive ? 'Aktivna' : 'Neaktivna'}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}
                      title="Obriši"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .admin-form-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 1.5rem;
        }
        .admin-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .admin-form-grid label {
          display: block;
          font-size: 0.8rem;
          font-weight: 700;
          color: #94a3b8;
          margin-bottom: 0.4rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .admin-form-grid input,
        .admin-form-grid select,
        .admin-form-grid textarea {
          width: 100%;
          padding: 0.65rem 0.85rem;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(15,23,42,0.6);
          color: #f1f5f9;
          font-size: 0.9rem;
          outline: none;
        }
        .admin-form-grid input:focus,
        .admin-form-grid select:focus,
        .admin-form-grid textarea:focus {
          border-color: #6366f1;
        }
        .admin-btn {
          padding: 0.6rem 1.2rem;
          border-radius: 10px;
          border: none;
          background: #6366f1;
          color: #fff;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .admin-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .admin-btn-ghost {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.12);
          color: #94a3b8;
        }
        @media (max-width: 640px) {
          .admin-form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
