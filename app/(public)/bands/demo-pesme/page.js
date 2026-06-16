'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Play, Pause, ExternalLink, Music, ShoppingBag, ArrowLeft, Lock, Clock, Download } from 'lucide-react';
import Link from 'next/link';

export default function DemoPesmePage() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [playingId, setPlayingId] = useState(null);
  const [audioLoading, setAudioLoading] = useState(null);
  const [accessMap, setAccessMap] = useState({}); // { songId: 'PENDING'|'APPROVED'|'DENIED' }
  const [requesting, setRequesting] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [songsRes, accessRes] = await Promise.all([
          fetch('/api/demo-songs'),
          fetch('/api/demo-songs/request'),
        ]);
        const songsData = await songsRes.json();
        if (Array.isArray(songsData)) setSongs(songsData);
        if (accessRes.ok) {
          const accessData = await accessRes.json();
          if (typeof accessData === 'object' && !Array.isArray(accessData)) setAccessMap(accessData);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const categories = [...new Set(songs.map((s) => s.category).filter(Boolean))];

  const filtered = songs.filter((s) => {
    const matchCat = !activeCategory || s.category === activeCategory;
    const q = searchTerm.toLowerCase();
    const matchSearch = s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const previewTimerRef = useRef(null);

  const playPreview = useCallback(async (songId) => {
    if (playingId === songId) {
      // Stop
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      setPlayingId(null);
      return;
    }

    setAudioLoading(songId);
    try {
      const r = await fetch(`/api/demo-songs/preview?id=${songId}`);
      const data = await r.json();
      if (!r.ok || !data.url) throw new Error(data.error || 'Greška');

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.addEventListener('ended', () => setPlayingId(null));
      }

      audioRef.current.pause();
      audioRef.current.src = data.url;

      // Wait for metadata to get duration, then limit to 25%
      audioRef.current.onloadedmetadata = () => {
        const totalDuration = audioRef.current.duration;
        const maxPlayTime = totalDuration * 0.25; // Only 25%
        if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
        previewTimerRef.current = setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
          }
          setPlayingId(null);
        }, maxPlayTime * 1000);
      };

      await audioRef.current.play();
      setPlayingId(songId);
    } catch (err) {
      console.error('Preview error:', err);
      alert('Nije moguće pustiti preview.');
    } finally {
      setAudioLoading(null);
    }
  }, [playingId]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  return (
    <div className="demo-container container">
      <div className="demo-back">
        <Link href="/bands" className="back-link">
          <ArrowLeft size={18} /> Kontrolna tabla
        </Link>
      </div>

      <header className="demo-header">
        <div className="demo-badge">
          <ShoppingBag size={14} /> AUTORSKE PESME
        </div>
        <h1>Autorske pesme u ponudi</h1>
        <p className="demo-subtitle">
          Preslušajte demo snimke autorskih pesama. Zaštićene autorskim pravima — preuzimanje dostupno samo Premium korisnicima uz odobrenje.
        </p>
      </header>

      <div className="demo-search">
        <Search size={18} />
        <input
          type="text"
          placeholder={`Pretraži ${songs.length} autorskih pesama...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {categories.length > 0 && (
        <div className="demo-tabs">
          <button
            type="button"
            className={`demo-tab ${!activeCategory ? 'active' : ''}`}
            onClick={() => setActiveCategory('')}
          >
            Sve ({songs.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`demo-tab ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat} ({songs.filter((s) => s.category === cat).length})
            </button>
          ))}
        </div>
      )}

      <main className="demo-list">
        {loading ? (
          <div className="demo-empty">
            <div className="demo-spinner"></div>
            <p>Učitavanje demo pesama...</p>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((song) => (
            <div key={song.id} className="demo-card">
              <div className="demo-card-main">
                <div className="demo-card-info">
                  <h3>{song.title}</h3>
                  <p className="demo-card-artist">{song.artist}</p>
                  {song.description && <p className="demo-card-desc">{song.description}</p>}
                </div>
                <div className="demo-card-meta">
                  {song.category && <span className="demo-chip">{song.category}</span>}
                  {song.price && <span className="demo-price">{song.price}</span>}
                </div>
              </div>
              <div className="demo-card-actions">
                {song.hasPreview && (
                  <button
                    type="button"
                    className={`demo-play-btn ${playingId === song.id ? 'playing' : ''}`}
                    onClick={() => playPreview(song.id)}
                    disabled={audioLoading === song.id}
                    title={playingId === song.id ? 'Zaustavi' : 'Pusti demo'}
                  >
                    {audioLoading === song.id ? (
                      <span className="demo-btn-spinner"></span>
                    ) : playingId === song.id ? (
                      <Pause size={18} />
                    ) : (
                      <Play size={18} />
                    )}
                    <span>{playingId === song.id ? 'Zaustavi' : 'Demo'}</span>
                  </button>
                )}
                {song.allowDownload && (() => {
                  const status = accessMap[song.id];
                  if (status === 'PAID') {
                    return (
                      <button
                        type="button"
                        className="demo-download-btn"
                        onClick={async () => {
                          try {
                            const r = await fetch(`/api/demo-songs/download?id=${song.id}`);
                            const data = await r.json();
                            if (!r.ok) { alert(data.error || 'Greška'); return; }
                            window.open(data.url, '_blank');
                          } catch { alert('Greška pri preuzimanju.'); }
                        }}
                      >
                        <Download size={16} />
                        <span>Preuzmi pesmu</span>
                      </button>
                    );
                  }
                  if (status === 'APPROVED') {
                    return (
                      <span className="demo-payment-info">
                        <span className="demo-payment-badge">Uputstvo za uplatu</span>
                        <span className="demo-payment-text">
                          Cena: <strong>{song.price || 'Po dogovoru'}</strong><br/>
                          Uplatite na račun: <strong>265-1234567-89</strong><br/>
                          Poziv na broj: <strong>vaš email</strong><br/>
                          Svrha: Autorska pesma — {song.title}
                        </span>
                      </span>
                    );
                  }
                  if (status === 'PENDING') {
                    return (
                      <span className="demo-pending-btn">
                        <Clock size={16} />
                        <span>Zahtev poslat — čeka odobrenje</span>
                      </span>
                    );
                  }
                  if (status === 'DENIED') {
                    return (
                      <span className="demo-denied-btn">
                        <Lock size={16} />
                        <span>Zahtev odbijen</span>
                      </span>
                    );
                  }
                  // No request yet
                  return (
                    <button
                      type="button"
                      className="demo-request-btn"
                      disabled={requesting === song.id}
                      onClick={async () => {
                        setRequesting(song.id);
                        try {
                          const r = await fetch('/api/demo-songs/request', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ songId: song.id }),
                          });
                          const data = await r.json();
                          if (!r.ok) { alert(data.error || 'Greška'); return; }
                          setAccessMap((prev) => ({ ...prev, [song.id]: data.status || 'PENDING' }));
                        } catch { alert('Greška.'); }
                        finally { setRequesting(null); }
                      }}
                    >
                      <Lock size={16} />
                      <span>{requesting === song.id ? 'Šaljem…' : 'Zatraži preuzimanje'}</span>
                    </button>
                  );
                })()}
              </div>
            </div>
          ))
        ) : (
          <div className="demo-empty">
            <Music size={32} />
            <p>{searchTerm ? 'Nema rezultata za pretragu.' : 'Trenutno nema autorskih pesama u ponudi.'}</p>
          </div>
        )}
      </main>

      <style jsx>{`
        .demo-container {
          padding-top: 2rem;
          padding-bottom: max(4rem, env(safe-area-inset-bottom, 0px));
          min-height: 100vh;
          min-height: 100dvh;
        }
        .demo-back {
          margin-bottom: 1.5rem;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s;
        }
        .back-link:hover { color: #e2e8f0; }
        .demo-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .demo-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(99, 102, 241, 0.1);
          color: #818cf8;
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 0.72rem;
          font-weight: 800;
          margin-bottom: 1rem;
          letter-spacing: 0.06em;
        }
        .demo-header h1 {
          font-size: clamp(1.6rem, 5vw, 2.5rem);
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 0.75rem;
          letter-spacing: -0.02em;
        }
        .demo-subtitle {
          color: #94a3b8;
          font-size: 1rem;
          max-width: 28rem;
          margin: 0 auto;
          line-height: 1.5;
        }
        .demo-search {
          max-width: 500px;
          margin: 0 auto 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.75rem 1.25rem;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 100px;
          transition: border-color 0.2s, box-shadow 0.2s;
          color: #64748b;
        }
        .demo-search:focus-within {
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .demo-search input {
          background: none;
          border: none;
          color: #f1f5f9;
          width: 100%;
          outline: none;
          font-size: 0.95rem;
        }
        .demo-search input::placeholder { color: #64748b; }
        .demo-tabs {
          display: flex;
          gap: 0.4rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          margin-bottom: 1.5rem;
          justify-content: center;
          -webkit-overflow-scrolling: touch;
        }
        .demo-tabs::-webkit-scrollbar { height: 3px; }
        .demo-tabs::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .demo-tab {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(99, 102, 241, 0.12);
          color: #94a3b8;
          padding: 0.5rem 0.9rem;
          border-radius: 100px;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.72rem;
          white-space: nowrap;
          transition: 0.2s;
        }
        .demo-tab:hover {
          background: rgba(99, 102, 241, 0.08);
          color: #e2e8f0;
        }
        .demo-tab.active {
          background: #6366f1;
          color: #fff;
          border-color: #6366f1;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        .demo-list {
          max-width: 700px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .demo-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(99, 102, 241, 0.08);
          border-radius: 16px;
          padding: 1.25rem;
          transition: 0.2s;
        }
        .demo-card:hover {
          border-color: rgba(99, 102, 241, 0.25);
          background: rgba(99, 102, 241, 0.04);
        }
        .demo-card-main {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.85rem;
        }
        .demo-card-info h3 {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: #f1f5f9;
        }
        .demo-card-artist {
          margin: 0.2rem 0 0;
          font-size: 0.85rem;
          color: #64748b;
        }
        .demo-card-desc {
          margin: 0.5rem 0 0;
          font-size: 0.84rem;
          color: #94a3b8;
          line-height: 1.4;
        }
        .demo-card-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.4rem;
          flex-shrink: 0;
        }
        .demo-chip {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.3rem 0.6rem;
          border-radius: 100px;
          background: rgba(99, 102, 241, 0.1);
          color: #818cf8;
        }
        .demo-price {
          font-size: 0.82rem;
          font-weight: 800;
          color: #4ade80;
        }
        .demo-card-actions {
          display: flex;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .demo-play-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.55rem 1rem;
          border-radius: 10px;
          border: 1px solid rgba(99, 102, 241, 0.25);
          background: rgba(99, 102, 241, 0.08);
          color: #818cf8;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          transition: 0.15s;
          min-height: 40px;
        }
        .demo-play-btn:hover {
          background: rgba(99, 102, 241, 0.15);
          border-color: #6366f1;
        }
        .demo-play-btn.playing {
          background: rgba(99, 102, 241, 0.2);
          border-color: #6366f1;
          color: #a5b4fc;
        }
        .demo-play-btn:disabled { opacity: 0.6; cursor: wait; }
        .demo-btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(99, 102, 241, 0.3);
          border-top-color: #818cf8;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        .demo-download-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.55rem 1rem;
          border-radius: 10px;
          border: 1px solid rgba(34, 197, 94, 0.25);
          background: rgba(34, 197, 94, 0.08);
          color: #4ade80;
          font-weight: 700;
          font-size: 0.82rem;
          text-decoration: none;
          transition: 0.15s;
          min-height: 40px;
          cursor: pointer;
        }
        .demo-download-btn:hover {
          background: rgba(34, 197, 94, 0.15);
          border-color: #22c55e;
        }
        .demo-request-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.55rem 1rem;
          border-radius: 10px;
          border: 1px solid rgba(251, 191, 36, 0.25);
          background: rgba(251, 191, 36, 0.08);
          color: #fbbf24;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          transition: 0.15s;
          min-height: 40px;
        }
        .demo-request-btn:hover {
          background: rgba(251, 191, 36, 0.15);
          border-color: #f59e0b;
        }
        .demo-request-btn:disabled { opacity: 0.6; cursor: wait; }
        .demo-pending-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.55rem 1rem;
          border-radius: 10px;
          border: 1px solid rgba(99, 102, 241, 0.2);
          background: rgba(99, 102, 241, 0.06);
          color: #a5b4fc;
          font-weight: 700;
          font-size: 0.82rem;
          min-height: 40px;
        }
        .demo-denied-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.55rem 1rem;
          border-radius: 10px;
          border: 1px solid rgba(248, 113, 113, 0.2);
          background: rgba(248, 113, 113, 0.06);
          color: #f87171;
          font-weight: 700;
          font-size: 0.82rem;
          min-height: 40px;
        }
        .demo-payment-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.85rem 1rem;
          border-radius: 10px;
          border: 1px solid rgba(34, 197, 94, 0.2);
          background: rgba(34, 197, 94, 0.05);
          width: 100%;
        }
        .demo-payment-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #4ade80;
          font-weight: 800;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .demo-payment-text {
          font-size: 0.82rem;
          color: #cbd5e1;
          line-height: 1.6;
        }
        .demo-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 4rem 2rem;
          color: #64748b;
          text-align: center;
        }
        .demo-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #334155;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Tablet landscape (768-1024px) */
        @media (min-width: 641px) and (max-width: 1024px) {
          .demo-list { max-width: 90%; }
          .demo-card { padding: 1.5rem; }
          .demo-card-info h3 { font-size: 1.1rem; }
          .demo-play-btn, .demo-download-btn, .demo-request-btn { min-height: 44px; padding: 0.6rem 1.2rem; }
        }

        /* Mobile (max 640px) */
        @media (max-width: 640px) {
          .demo-container {
            padding-top: 1.5rem;
            padding-left: max(1rem, env(safe-area-inset-left, 0px));
            padding-right: max(1rem, env(safe-area-inset-right, 0px));
          }
          .demo-header h1 { font-size: 1.5rem; }
          .demo-subtitle { font-size: 0.9rem; }
          .demo-card { padding: 1rem; }
          .demo-card-main { flex-direction: column; gap: 0.5rem; }
          .demo-card-meta { flex-direction: row; align-items: center; }
          .demo-card-actions { width: 100%; }
          .demo-play-btn, .demo-download-btn, .demo-request-btn, .demo-pending-btn, .demo-denied-btn {
            flex: 1;
            justify-content: center;
            min-height: 44px;
            font-size: 0.84rem;
          }
          .demo-tabs { justify-content: flex-start; padding: 0 0.5rem 0.5rem; }
          .demo-search input { font-size: 16px; } /* prevent iOS zoom on focus */
        }

        /* Small phones (max 380px) */
        @media (max-width: 380px) {
          .demo-card-actions { flex-direction: column; }
          .demo-play-btn, .demo-download-btn, .demo-request-btn, .demo-pending-btn, .demo-denied-btn { width: 100%; justify-content: center; }
          .demo-header h1 { font-size: 1.3rem; }
          .demo-badge { font-size: 0.65rem; }
        }
      `}</style>
    </div>
  );
}
