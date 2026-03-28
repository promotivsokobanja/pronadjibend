'use client';
import { Search, Music, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function GuestLivePage({ params }) {
  const bandId = params.id;
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tableNum, setTableNum] = useState('');
  const [selectedSong, setSelectedSong] = useState(null);
  const [requestSent, setRequestSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const resp = await fetch(`/api/songs?bandId=${encodeURIComponent(bandId)}`);
        const data = await resp.json();
        const list = Array.isArray(data) ? data : [];
        setSongs(list);
        const cats = [...new Set(list.map((s) => s.category || s.type).filter(Boolean))];
        if (cats.length > 0 && !activeTab) setActiveTab(cats[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSongs();
  }, [bandId]);

  const categories = [...new Set(songs.map((s) => s.category || s.type).filter(Boolean))];

  const filteredSongs = songs.filter((s) => {
    const cat = s.category || s.type || '';
    const matchCat = !activeTab || cat === activeTab;
    const q = searchTerm.toLowerCase();
    const matchSearch =
      (s.title || '').toLowerCase().includes(q) ||
      (s.artist || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const confirmRequest = async () => {
    if (!tableNum) return alert('Molimo unesite broj stola.');
    if (!selectedSong?.id) return;

    setSending(true);
    setError('');

    try {
      const resp = await fetch('/api/live-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId: selectedSong.id,
          bandId,
          tableNum,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Greška pri slanju zahteva');

      setRequestSent(true);
      setTimeout(() => {
        setRequestSent(false);
        setSelectedSong(null);
        setTableNum('');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="guest-container container">
      <div className="blob" style={{ top: '10%', right: '10%' }}></div>
      <header className="guest-header">
        <div className="live-indicator"><span className="dot"></span> UŽIVO NASTUP</div>
        <h1>Pronađi Bend</h1>
        <p className="subtitle-text">Izaberite pesmu i pošaljite zahtev bendu direktno sa vašeg stola.</p>
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder={`Pretraži ${songs.length}+ pesama...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {categories.length > 0 && (
          <div className="gender-tabs-container">
            <div className="gender-tabs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`tab-btn ${activeTab === cat ? 'active' : ''}`}
                  onClick={() => setActiveTab(cat)}
                >
                  {cat} ({songs.filter((s) => (s.category || s.type) === cat).length})
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="song-list">
        {loading ? (
          <div className="empty-state">
            <div className="spinner"></div>
            <p>Učitavanje repertoara...</p>
          </div>
        ) : filteredSongs.length > 0 ? (
          filteredSongs.map((song) => (
            <div key={song.id} className="song-row glass-card" onClick={() => setSelectedSong(song)}>
              <div className="song-info">
                <p className="song-title">{song.title}</p>
                <p className="song-artist">{song.artist || 'Nepoznat izvođač'}</p>
              </div>
              <button className="btn btn-secondary btn-sm" type="button">Naruči</button>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Music size={32} />
            <p>{searchTerm ? 'Nema rezultata za pretragu.' : 'Repertoar je prazan.'}</p>
          </div>
        )}
      </main>

      {selectedSong && !requestSent && (
        <div className="modal-overlay">
          <div className="modal glass-card">
            <h3>Naruči Pesmu</h3>
            <p className="selected-song">{selectedSong.title} {selectedSong.artist ? `— ${selectedSong.artist}` : ''}</p>
            {error && (
              <div className="error-msg">
                <AlertCircle size={16} /> {error}
              </div>
            )}
            <div className="form-group">
              <label>Vaš broj stola:</label>
              <input
                type="number"
                placeholder="npr. 12"
                value={tableNum}
                onChange={(e) => setTableNum(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setSelectedSong(null); setError(''); }} type="button">
                Odustani
              </button>
              <button className="btn btn-primary" onClick={confirmRequest} disabled={sending} type="button">
                {sending ? 'Šaljem...' : 'Pošalji Bendu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {requestSent && (
        <div className="modal-overlay">
          <div className="success-card glass-card">
            <CheckCircle2 size={48} color="var(--accent-primary)" />
            <h2>Zahtev Poslat</h2>
            <p>Hvala! Vaša narudžbina je stigla do benda.</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .guest-container { padding-top: 4rem; padding-bottom: 4rem; min-height: 100vh; }
        .guest-header { text-align: center; margin-bottom: 4rem; }
        .live-indicator { display: inline-flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.1); color: var(--accent-primary); padding: 4px 12px; border-radius: 100px; font-size: 0.7rem; font-weight: 800; margin-bottom: 1.5rem; }
        .dot { width: 6px; height: 6px; background: var(--accent-primary); border-radius: 50%; animation: pulse 1s infinite alternate; }
        @keyframes pulse { from { opacity: 0.4; } to { opacity: 1; } }
        .guest-header h1 { font-size: 3rem; font-weight: 800; margin-bottom: 1rem; color: #0f172a; }
        .subtitle-text { color: #64748b; font-size: 1rem; }
        .search-bar { max-width: 500px; margin: 2.5rem auto 1.5rem; display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1.25rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 100px; }
        .search-bar input { background: none; border: none; color: #0f172a; width: 100%; outline: none; font-size: 0.95rem; }
        .search-bar input::placeholder { color: #94a3b8; }

        .gender-tabs-container { overflow-x: auto; margin-top: 2rem; padding-bottom: 1rem; -webkit-overflow-scrolling: touch; }
        .gender-tabs-container::-webkit-scrollbar { height: 4px; }
        .gender-tabs-container::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

        .gender-tabs { display: flex; justify-content: center; gap: 0.5rem; min-width: max-content; padding: 0 1rem; }
        .tab-btn { background: #f8fafc; border: 1px solid #e2e8f0; color: #64748b; padding: 0.6rem 1rem; border-radius: 100px; cursor: pointer; transition: 0.3s; font-weight: 700; font-size: 0.7rem; white-space: nowrap; }
        .tab-btn:hover { background: #f1f5f9; color: #0f172a; }
        .tab-btn.active { background: #007AFF; color: white; border-color: #007AFF; }

        .song-list { max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 0.5rem; }
        .song-row { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; cursor: pointer; border: 1px solid #e2e8f0; transition: 0.2s; background: #ffffff; border-radius: 16px; }
        .song-row:hover { background: #f8fafc; transform: translateY(-2px); border-color: #007AFF; box-shadow: 0 4px 12px rgba(0, 122, 255, 0.08); }
        .song-title { font-weight: 700; font-size: 1.05rem; margin-bottom: 0.25rem; color: #0f172a; }
        .song-artist { font-size: 0.85rem; color: #64748b; }

        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 1.5rem; }
        .modal, .success-card { width: 100%; max-width: 400px; padding: 3rem; text-align: center; background: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; }
        .modal h3 { color: #0f172a; font-size: 1.5rem; margin-bottom: 0.5rem; }
        .selected-song { font-size: 1.1rem; font-weight: 700; margin: 1rem 0 2rem; color: #007AFF; }
        .form-group label { display: block; margin-bottom: 0.75rem; font-size: 0.85rem; font-weight: 600; color: #64748b; text-transform: uppercase; }
        .form-group input {
          width: 100%;
          padding: 1rem;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          color: #0f172a;
          font-size: 1.5rem;
          text-align: center;
          font-weight: 800;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-group input::placeholder { color: #94a3b8; font-weight: 400; }
        .form-group input:focus { border-color: #007AFF; }
        .modal-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem; }

        .success-card h2 { color: #0f172a; margin: 1rem 0 0.5rem; }
        .success-card p { color: #64748b; }

        .error-msg {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 4rem 2rem; color: #94a3b8; }
        .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #007AFF; border-radius: 50%; animation: spin 0.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 640px) {
          .guest-header h1 { font-size: 2rem; }
          .song-row { padding: 1rem; }
          .modal, .success-card { padding: 2rem 1.5rem; }
        }
      `}</style>
    </div>
  );
}
