'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Play, Pause, Music, ShoppingBag, ArrowLeft, Lock, Clock, Download, X, FileText } from 'lucide-react';
import Link from 'next/link';

export default function DemoPesmePage() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [playingId, setPlayingId] = useState(null);
  const [audioLoading, setAudioLoading] = useState(null);
  const [accessMap, setAccessMap] = useState({});
  const [requesting, setRequesting] = useState(null);
  const [lyricsModal, setLyricsModal] = useState(null); // { title, artist, lyrics }
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

  const handleDownload = async (songId) => {
    try {
      const r = await fetch(`/api/demo-songs/download?id=${songId}`);
      const data = await r.json();
      if (!r.ok) { alert(data.error || 'Greška'); return; }
      if (data.lyrics) {
        setLyricsModal({ title: data.title, artist: data.artist, lyrics: data.lyrics, url: data.url });
      } else {
        window.open(data.url, '_blank');
      }
    } catch { alert('Greška pri preuzimanju.'); }
  };

  const handleRequest = async (songId) => {
    setRequesting(songId);
    try {
      const r = await fetch('/api/demo-songs/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }),
      });
      const data = await r.json();
      if (!r.ok) { alert(data.error || 'Greška'); return; }
      setAccessMap((prev) => ({ ...prev, [songId]: data.status || 'PENDING' }));
    } catch { alert('Greška.'); }
    finally { setRequesting(null); }
  };

  const renderStatus = (song) => {
    const status = accessMap[song.id];
    if (status === 'PAID') {
      return (
        <div className="ap-actions">
          <button type="button" className="ap-btn ap-btn-download" onClick={() => handleDownload(song.id)}>
            <Download size={14} /> Preuzmi
          </button>
          <button type="button" className="ap-btn ap-btn-lyrics" onClick={() => handleDownload(song.id)}>
            <FileText size={14} /> Tekst
          </button>
        </div>
      );
    }
    if (status === 'APPROVED') {
      return (
        <div className="ap-payment-box">
          <span className="ap-payment-label">Uputstvo za uplatu:</span>
          <span className="ap-payment-details">
            Cena: <strong>{song.price || 'Po dogovoru'}</strong> · Svrha: {song.title}
          </span>
        </div>
      );
    }
    if (status === 'PENDING') {
      return <span className="ap-status ap-status-pending"><Clock size={13} /> Na čekanju</span>;
    }
    if (status === 'DENIED') {
      return <span className="ap-status ap-status-denied"><Lock size={13} /> Odbijeno</span>;
    }
    return (
      <button type="button" className="ap-btn ap-btn-request" disabled={requesting === song.id} onClick={() => handleRequest(song.id)}>
        <ShoppingBag size={14} /> {requesting === song.id ? 'Šaljem…' : 'Kupi'}
      </button>
    );
  };

  return (
    <div className="ap-wrap container">
      <div className="ap-back">
        <Link href="/bands" className="ap-back-link"><ArrowLeft size={16} /> Nazad</Link>
      </div>

      <header className="ap-hero">
        <h1>Autorske Pesme</h1>
        <p>Originalne kompozicije zaštićene autorskim pravima. Preslušajte demo — kupite licencu.</p>
      </header>

      <div className="ap-toolbar">
        <div className="ap-search">
          <Search size={16} />
          <input type="text" placeholder="Pretraži pesme..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {categories.length > 0 && (
          <div className="ap-filters">
            <button type="button" className={`ap-filter ${!activeCategory ? 'active' : ''}`} onClick={() => setActiveCategory('')}>Sve</button>
            {categories.map((cat) => (
              <button key={cat} type="button" className={`ap-filter ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>{cat}</button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="ap-loading"><div className="ap-spinner" /><p>Učitavanje...</p></div>
      ) : filtered.length === 0 ? (
        <div className="ap-loading"><Music size={28} /><p>{searchTerm ? 'Nema rezultata.' : 'Nema pesama u ponudi.'}</p></div>
      ) : (
        <div className="ap-grid">
          {filtered.map((song) => (
            <div key={song.id} className="ap-card">
              <div className="ap-card-top">
                <div className="ap-card-info">
                  <h3>{song.title}</h3>
                  <span className="ap-artist">{song.artist}</span>
                </div>
                <div className="ap-card-right">
                  {song.category && <span className="ap-cat">{song.category}</span>}
                  {song.price && <span className="ap-price">{song.price} RSD</span>}
                </div>
              </div>
              {song.description && <p className="ap-desc">{song.description}</p>}
              <div className="ap-card-bottom">
                {song.hasPreview && (
                  <button
                    type="button"
                    className={`ap-btn ap-btn-play ${playingId === song.id ? 'playing' : ''}`}
                    onClick={() => playPreview(song.id)}
                    disabled={audioLoading === song.id}
                  >
                    {audioLoading === song.id ? <span className="ap-spin-sm" /> : playingId === song.id ? <Pause size={14} /> : <Play size={14} />}
                    {playingId === song.id ? 'Stop' : 'Demo'}
                  </button>
                )}
                {renderStatus(song)}
              </div>
            </div>
          ))}
        </div>
      )}

      {lyricsModal && (
        <div className="ap-modal-overlay" onClick={() => setLyricsModal(null)}>
          <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-header">
              <div>
                <h2>{lyricsModal.title}</h2>
                <span className="ap-modal-artist">{lyricsModal.artist}</span>
              </div>
              <button type="button" className="ap-modal-close" onClick={() => setLyricsModal(null)}><X size={20} /></button>
            </div>
            <pre className="ap-modal-lyrics">{lyricsModal.lyrics}</pre>
            <div className="ap-modal-footer">
              <button type="button" className="ap-btn ap-btn-download" onClick={() => { window.open(lyricsModal.url, '_blank'); }}>
                <Download size={14} /> Preuzmi MP3
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .ap-wrap { padding: 1.5rem 0; padding-bottom: max(3rem, env(safe-area-inset-bottom)); min-height: 100dvh; }
        .ap-back { margin-bottom: 1rem; }
        .ap-back-link { display: inline-flex; align-items: center; gap: 4px; color: #64748b; font-size: 0.82rem; font-weight: 600; text-decoration: none; }
        .ap-back-link:hover { color: #e2e8f0; }
        .ap-hero { text-align: center; margin-bottom: 1.5rem; }
        .ap-hero h1 { font-size: clamp(1.5rem, 4vw, 2.2rem); font-weight: 800; color: #fff; margin: 0 0 0.4rem; letter-spacing: -0.02em; }
        .ap-hero p { color: #94a3b8; font-size: 0.9rem; margin: 0; }
        .ap-toolbar { max-width: 600px; margin: 0 auto 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .ap-search { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 1rem; background: rgba(15,23,42,0.8); border: 1px solid rgba(99,102,241,0.12); border-radius: 50px; color: #64748b; }
        .ap-search:focus-within { border-color: rgba(99,102,241,0.4); box-shadow: 0 0 0 2px rgba(99,102,241,0.08); }
        .ap-search input { background: none; border: none; color: #f1f5f9; width: 100%; outline: none; font-size: 16px; }
        .ap-search input::placeholder { color: #475569; }
        .ap-filters { display: flex; gap: 0.3rem; overflow-x: auto; -webkit-overflow-scrolling: touch; justify-content: center; }
        .ap-filter { background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.06); color: #94a3b8; padding: 0.35rem 0.75rem; border-radius: 50px; cursor: pointer; font-weight: 700; font-size: 0.7rem; white-space: nowrap; transition: 0.15s; }
        .ap-filter:hover { color: #e2e8f0; background: rgba(99,102,241,0.06); }
        .ap-filter.active { background: #6366f1; color: #fff; border-color: #6366f1; }
        .ap-grid { display: flex; flex-direction: column; gap: 0.6rem; max-width: 650px; margin: 0 auto; }
        .ap-card { background: rgba(15,23,42,0.5); border: 1px solid rgba(99,102,241,0.06); border-radius: 12px; padding: 0.9rem 1rem; display: flex; flex-direction: column; gap: 0.5rem; transition: 0.15s; }
        .ap-card:hover { border-color: rgba(99,102,241,0.2); background: rgba(99,102,241,0.03); }
        .ap-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
        .ap-card-info h3 { margin: 0; font-size: 0.92rem; font-weight: 700; color: #f1f5f9; line-height: 1.2; }
        .ap-artist { font-size: 0.76rem; color: #64748b; }
        .ap-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; flex-shrink: 0; }
        .ap-cat { font-size: 0.62rem; font-weight: 700; padding: 2px 7px; border-radius: 50px; background: rgba(99,102,241,0.1); color: #818cf8; }
        .ap-price { font-size: 0.8rem; font-weight: 800; color: #4ade80; }
        .ap-desc { margin: 0; font-size: 0.78rem; color: #94a3b8; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .ap-card-bottom { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-top: auto; }
        .ap-btn { display: inline-flex; align-items: center; gap: 4px; padding: 0.4rem 0.7rem; border-radius: 8px; border: none; font-weight: 700; font-size: 0.72rem; cursor: pointer; transition: 0.15s; min-height: 32px; }
        .ap-btn-play { background: rgba(99,102,241,0.1); color: #818cf8; border: 1px solid rgba(99,102,241,0.2); }
        .ap-btn-play:hover { background: rgba(99,102,241,0.18); }
        .ap-btn-play.playing { background: rgba(99,102,241,0.2); color: #a5b4fc; }
        .ap-btn-play:disabled { opacity: 0.5; cursor: wait; }
        .ap-btn-request { background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
        .ap-btn-request:hover { background: rgba(251,191,36,0.18); }
        .ap-btn-request:disabled { opacity: 0.5; cursor: wait; }
        .ap-btn-download { background: rgba(34,197,94,0.1); color: #4ade80; border: 1px solid rgba(34,197,94,0.2); }
        .ap-btn-download:hover { background: rgba(34,197,94,0.18); }
        .ap-btn-lyrics { background: rgba(139,92,246,0.1); color: #a78bfa; border: 1px solid rgba(139,92,246,0.2); }
        .ap-btn-lyrics:hover { background: rgba(139,92,246,0.18); }
        .ap-status { display: inline-flex; align-items: center; gap: 4px; font-size: 0.7rem; font-weight: 700; padding: 0.3rem 0.6rem; border-radius: 6px; }
        .ap-status-pending { background: rgba(99,102,241,0.08); color: #a5b4fc; }
        .ap-status-denied { background: rgba(248,113,113,0.08); color: #f87171; }
        .ap-actions { display: flex; gap: 0.3rem; }
        .ap-payment-box { width: 100%; padding: 0.5rem 0.7rem; border-radius: 8px; background: rgba(34,197,94,0.05); border: 1px solid rgba(34,197,94,0.15); }
        .ap-payment-label { font-size: 0.68rem; font-weight: 800; color: #4ade80; text-transform: uppercase; letter-spacing: 0.03em; }
        .ap-payment-details { display: block; font-size: 0.75rem; color: #cbd5e1; margin-top: 2px; line-height: 1.4; }
        .ap-loading { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 3rem; color: #64748b; }
        .ap-spinner { width: 28px; height: 28px; border: 3px solid #334155; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.6s linear infinite; }
        .ap-spin-sm { width: 12px; height: 12px; border: 2px solid rgba(99,102,241,0.3); border-top-color: #818cf8; border-radius: 50%; animation: spin 0.5s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ap-modal-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .ap-modal { background: #1e293b; border: 1px solid rgba(99,102,241,0.15); border-radius: 16px; max-width: 550px; width: 100%; max-height: 80vh; display: flex; flex-direction: column; }
        .ap-modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 1.25rem 1.25rem 0.75rem; }
        .ap-modal-header h2 { margin: 0; font-size: 1.1rem; color: #f1f5f9; }
        .ap-modal-artist { font-size: 0.82rem; color: #64748b; }
        .ap-modal-close { background: none; border: none; color: #64748b; cursor: pointer; padding: 4px; }
        .ap-modal-close:hover { color: #f1f5f9; }
        .ap-modal-lyrics { flex: 1; overflow-y: auto; padding: 0 1.25rem; margin: 0; font-family: inherit; font-size: 0.88rem; color: #cbd5e1; line-height: 1.7; white-space: pre-wrap; }
        .ap-modal-footer { padding: 1rem 1.25rem; border-top: 1px solid rgba(255,255,255,0.06); display: flex; gap: 0.5rem; }
        /* Mobile — phones */
        @media (max-width: 640px) {
          .ap-wrap { padding-left: max(0.75rem, env(safe-area-inset-left)); padding-right: max(0.75rem, env(safe-area-inset-right)); }
          .ap-hero h1 { font-size: 1.4rem; }
          .ap-hero p { font-size: 0.82rem; }
          .ap-grid { gap: 0.5rem; }
          .ap-card { padding: 0.85rem; }
          .ap-card-bottom { flex-direction: column; align-items: stretch; gap: 0.35rem; }
          .ap-btn { justify-content: center; min-height: 44px; font-size: 0.78rem; }
          .ap-status { min-height: 44px; justify-content: center; width: 100%; }
          .ap-filters { justify-content: flex-start; padding-bottom: 0.3rem; }
          .ap-filter { padding: 0.4rem 0.85rem; min-height: 36px; display: flex; align-items: center; }
          .ap-payment-box { padding: 0.6rem 0.8rem; }
          .ap-modal { max-height: 90dvh; border-radius: 12px; margin: env(safe-area-inset-top, 0px) 0.5rem env(safe-area-inset-bottom, 0px); }
          .ap-modal-overlay { padding: 0.5rem; }
          .ap-modal-lyrics { font-size: 0.84rem; -webkit-overflow-scrolling: touch; }
          .ap-modal-footer { padding: 0.85rem 1rem; }
          .ap-actions { width: 100%; }
          .ap-actions .ap-btn { flex: 1; }
        }
        /* Small phones — iPhone SE, etc */
        @media (max-width: 380px) {
          .ap-hero h1 { font-size: 1.2rem; }
          .ap-card-info h3 { font-size: 0.85rem; }
          .ap-price { font-size: 0.72rem; }
          .ap-search { padding: 0.5rem 0.85rem; }
        }
        /* Tablet */
        @media (min-width: 641px) and (max-width: 1024px) {
          .ap-grid { max-width: 600px; }
          .ap-btn { min-height: 38px; }
        }
      `}</style>
    </div>
  );
}
