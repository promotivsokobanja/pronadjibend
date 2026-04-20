'use client';
import { ChevronUp, ChevronDown, Play, Pause, RefreshCcw, ArrowLeft, Bell, Check, X, Edit2, Music } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

export const dynamic = 'force-dynamic';

export default function SongView({ params }) {
  const id = params?.id;
  const [song, setSong] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [librarySongs, setLibrarySongs] = useState([]);
  const [importSongId, setImportSongId] = useState('');

  const [keyOffset, setKeyOffset] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [nextSongs, setNextSongs] = useState([]);
  const scrollRef = useRef(null);

  const handleStepBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = '/bands/repertoire';
  };

  const fetchSong = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await fetch(`/api/songs/${id}`);
      const data = await resp.json();
      setSong(data);
      setEditContent(data.lyrics || '');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSong();
  }, [fetchSong]);

  // Full-screen popup: lock body scroll while this view is open.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // ESC closes the popup.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !isEditing) {
        handleStepBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isEditing]);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const resp = await fetch('/api/songs');
        if (!resp.ok) return;
        const data = await resp.json();
        const usable = (Array.isArray(data) ? data : []).filter(
          (s) => String(s.id) !== String(id) && s.lyrics
        );
        setLibrarySongs(usable);
      } catch {
        // Ignore optional import source errors.
      }
    };
    fetchLibrary();
  }, [id]);

  const handleSave = async () => {
    try {
      await fetch(`/api/songs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics: editContent })
      });
      setSong({ ...song, lyrics: editContent });
      setIsEditing(false);
    } catch (err) {
      alert('Greška pri čuvanju');
    }
  };

  const handleImportLyrics = async (songIdParam) => {
    const sourceId = songIdParam || importSongId;
    if (!sourceId) return;
    try {
      const resp = await fetch(`/api/songs/${sourceId}`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (data?.lyrics) {
        setEditContent(data.lyrics);
      }
    } catch {
      // Ignore import errors.
    }
  };

  // Transposition logic
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const transposeText = (text, offset) => {
    if (!text) return '';
    if (offset === 0) return text;
    return text.replace(/\[([A-G][#b]?)\]/g, (match, chord) => {
      let index = keys.indexOf(chord);
      if (index === -1) return match;
      let newIndex = (index + offset + 12) % 12;
      return `[${keys[newIndex]}]`;
    });
  };

  // Auto-scroll effect
  useEffect(() => {
    let interval;
    if (isScrolling) {
      interval = setInterval(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop += 1;
        }
      }, 50 / scrollSpeed);
    }
    return () => clearInterval(interval);
  }, [isScrolling, scrollSpeed]);

  const acceptRequest = () => {
    setNextSongs(prev => [incomingRequest, ...prev]);
    setIncomingRequest(null);
    localStorage.removeItem('liveRequest');
  };

  if (isLoading) return <div className="loading-screen"><div className="loader"></div></div>;
  if (!song) return <div className="error-screen">Pesma nije pronađena.</div>;

  return (
    <div className="stage-view-container" role="dialog" aria-modal="true" aria-label={`Tekst pesme: ${song.title}`}>
      <header className="stage-nav">
        <button
          type="button"
          className="back-link close-x"
          onClick={handleStepBack}
          aria-label="Zatvori"
          title="Zatvori (Esc)"
        >
          <X size={20} />
        </button>
        <div className="song-meta">
          <h1>{song.title}</h1>
          <p>{song.artist}</p>
        </div>
        <div className="header-controls">
          <button className={`btn-edit ${isEditing ? 'active' : ''}`} onClick={() => isEditing ? handleSave() : setIsEditing(true)}>
            {isEditing ? <Check size={18} /> : <Edit2 size={18} />}
            <span className="desktop-only">{isEditing ? 'SAČUVAJ' : 'IZMENI'}</span>
          </button>
          {!isEditing && (
            <div className="transpose-box">
              <button onClick={() => setKeyOffset(prev => prev - 1)}>-b</button>
              <div className="current-key">{keys[(keys.indexOf(song.key || 'C') + keyOffset + 12) % 12]}</div>
              <button onClick={() => setKeyOffset(prev => prev + 1)}>+#</button>
            </div>
          )}
        </div>
      </header>

      <main className="stage-lyrics" ref={scrollRef}>
        {isEditing ? (
          <div className="edit-layout">
            <div className="edit-actions-row">
              <button type="button" className="edit-nav-btn" onClick={handleStepBack}>
                <ArrowLeft size={16} /> Korak nazad
              </button>
              <button type="button" className="edit-nav-btn ghost" onClick={() => setIsEditing(false)}>
                <X size={16} /> Izađi iz unosa
              </button>
            </div>
            {librarySongs.length > 0 && (
              <div className="import-row">
                <select
                  value={importSongId}
                  onChange={async (e) => {
                    const nextId = e.target.value;
                    setImportSongId(nextId);
                    await handleImportLyrics(nextId);
                  }}
                  className="import-select"
                >
                  <option value="">Preuzmi tekst iz druge pesme...</option>
                  {librarySongs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} — {s.artist}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="import-btn"
                  onClick={handleImportLyrics}
                  disabled={!importSongId}
                >
                  Preuzmi ponovo
                </button>
              </div>
            )}
            <textarea 
              className="edit-area" 
              value={editContent} 
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Nalepi tekst i akorde (koristi [G] format za akorde)..."
            />
          </div>
        ) : (
          <pre className="lyrics-content">
            {song.lyrics ? (
              transposeText(song.lyrics, keyOffset).replace(/\r/g, '').split('\n').map((line, i) => (
                <div key={i} className="line">
                  {line
                    ? line.split(/(\[[A-G][#b]?(?:m|maj|min|sus|dim|aug)?[0-9]?\])/g).map((part, j) => (
                    part.startsWith('[') ? 
                    <span key={j} className="chord-tag">{part.slice(1, -1)}</span> : 
                    <span key={j}>{part}</span>
                    ))
                    : <span className="line-spacer">&nbsp;</span>}
                </div>
              ))
            ) : (
              <div className="no-lyrics glass-card">
                <Music size={48} />
                <p>Tekst za ovu pesmu još nije dodat.</p>
                <button className="btn btn-primary" onClick={() => setIsEditing(true)}>DODAJ TEKST</button>
              </div>
            )}
          </pre>
        )}

        {nextSongs.length > 0 && (
          <div className="queue-pill glass-card">
            <span className="label">SLEDEĆE:</span>
            {nextSongs.map((s, idx) => (
              <span key={idx} className="queue-item">{s.title} (Sto {s.table})</span>
            ))}
          </div>
        )}
      </main>

      {!isEditing && (
        <footer className="stage-footer">
          <div className="speed-ctrl">
            <button className={scrollSpeed === 1 ? 'active' : ''} onClick={() => setScrollSpeed(1)}>x1</button>
            <button className={scrollSpeed === 1.5 ? 'active' : ''} onClick={() => setScrollSpeed(1.5)}>x1.5</button>
            <button className={scrollSpeed === 2 ? 'active' : ''} onClick={() => setScrollSpeed(2)}>x2</button>
          </div>
          
          <button className="play-trigger" onClick={() => setIsScrolling(!isScrolling)}>
            {isScrolling ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
          </button>

          <div className="status-readout">
            <span>{isScrolling ? 'SKROLOVANJE' : 'PAUZIRANO'}</span>
            <span>KEY OFFSET: {keyOffset > 0 ? `+${keyOffset}` : keyOffset}</span>
          </div>
        </footer>
      )}

      <style jsx>{`
        .stage-view-container {
          position: fixed;
          inset: 0;
          height: 100dvh;
          min-height: 100dvh;
          margin-top: 0;
          background: #000;
          color: #fff;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1500;
          animation: stage-fade-in 0.18s ease;
        }
        @keyframes stage-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .stage-nav { 
          padding: 1.5rem 3rem; border-bottom: 1px solid #1a1a1e; 
          display: flex; justify-content: space-between; align-items: center; background: #000;
          position: sticky;
          top: 0;
          z-index: 8;
        }
        .header-controls { display: flex; align-items: center; gap: 2rem; }
        .btn-edit { background: #111; border: 1px solid #222; color: #888; padding: 0.6rem 1.25rem; border-radius: 8px; display: flex; align-items: center; gap: 0.75rem; font-weight: 700; cursor: pointer; transition: 0.3s; }
        .btn-edit.active { border-color: var(--accent-primary); color: var(--accent-primary); background: rgba(16, 185, 129, 0.05); }
        .btn-edit:hover { background: #222; }
        
        .edit-area { 
          width: 100%; height: 100%; background: #050505; border: 1px dashed #333; 
          color: #fff; font-family: monospace; font-size: 1.25rem; padding: 2rem; outline: none; resize: none;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .edit-layout { height: 100%; display: flex; flex-direction: column; gap: 0.75rem; }
        .edit-actions-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          align-items: center;
        }
        .edit-nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: #111;
          border: 1px solid #2a2a2a;
          color: #d1d5db;
          border-radius: 8px;
          padding: 0.55rem 0.8rem;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          cursor: pointer;
        }
        .edit-nav-btn:hover { border-color: #00ff00; color: #00ff00; }
        .edit-nav-btn.ghost:hover { border-color: #f59e0b; color: #f59e0b; }
        .import-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.6rem;
          padding: 0.35rem 0;
        }
        .import-select {
          background: #0b0b0b;
          border: 1px solid #222;
          color: #d1d5db;
          border-radius: 8px;
          padding: 0.6rem 0.75rem;
          outline: none;
          font-size: 0.85rem;
        }
        .import-select:focus { border-color: #00ff00; }
        .import-btn {
          background: #111;
          border: 1px solid #2a2a2a;
          color: #cbd5e1;
          border-radius: 8px;
          padding: 0.6rem 0.9rem;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          cursor: pointer;
        }
        .import-btn:hover:not(:disabled) { border-color: #00ff00; color: #00ff00; }
        .import-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .no-lyrics { text-align: center; padding: 5rem; display: flex; flex-direction: column; align-items: center; gap: 2rem; color: #444; }

        .back-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: #cbd5e1;
          font-weight: 800;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          position: relative;
          z-index: 9;
        }
        .back-link:hover { color: #ffffff; }
        .close-x {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          border: 1px solid #2a2a2a;
          background: #0d0d0d;
          color: #e2e8f0;
          cursor: pointer;
          transition: 0.2s ease;
          flex-shrink: 0;
          padding: 0;
        }
        .close-x:hover {
          background: #ef4444;
          border-color: #ef4444;
          color: #000;
          transform: scale(1.04);
        }
        .close-x:active { transform: scale(0.98); }
        .song-meta h1 { font-size: 1.5rem; font-weight: 800; margin: 0; }
        .song-meta p { font-size: 0.9rem; color: #555; margin: 0; font-weight: 600; }
        
        .transpose-box { display: flex; align-items: center; gap: 1rem; }
        .transpose-box button { background: #111; border: 1px solid #222; color: #fff; width: 40px; height: 40px; border-radius: 8px; cursor: pointer; font-weight: 800; }
        .current-key { font-size: 1.5rem; font-weight: 950; color: var(--accent-primary); width: 40px; text-align: center; }

        .stage-lyrics {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          padding: 4rem 10% 8rem;
          scroll-behavior: smooth;
          position: relative;
        }
        .lyrics-content { font-family: 'Outfit', sans-serif; font-size: 1.3rem; line-height: 1.7; white-space: pre-wrap; font-weight: 500; }
        .line {
          margin-bottom: 0.9rem;
          white-space: pre-wrap;
          word-break: break-word;
          min-height: 1.45em;
        }
        .chord-tag { 
          color: var(--accent-primary); font-weight: 900; font-size: 0.8rem; 
          background: rgba(16, 185, 129, 0.05); padding: 0 4px; border-radius: 4px;
          margin-right: 2px;
          display: inline-block;
        }
        .line-spacer { display: inline-block; width: 100%; min-height: 1.2em; }

        .loading-screen { height: 100vh; display: flex; align-items: center; justify-content: center; background: #000; }

        .stage-footer { 
          padding: 1.5rem 3rem; background: #000; border-top: 1px solid #1a1a1e; 
          display: flex; justify-content: space-between; align-items: center;
        }
        .speed-ctrl { display: flex; gap: 0.5rem; }
        .speed-ctrl button { background: #111; border: 1px solid #222; color: #555; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 800; cursor: pointer; }
        .speed-ctrl button.active { background: var(--accent-primary); color: #000; border-color: var(--accent-primary); }
        
        .play-trigger { background: var(--accent-primary); color: #000; border: none; width: 60px; height: 60px; border-radius: 30px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .play-trigger:hover { transform: scale(1.05); }
        
        .status-readout { text-align: right; display: flex; flex-direction: column; gap: 4px; font-size: 0.65rem; font-weight: 800; color: #333; letter-spacing: 1px; }

        @media (max-width: 968px) {
          .lyrics-content { font-size: 1.25rem; line-height: 1.6; }
          .line { margin-bottom: 1rem; }
          .chord-tag { font-size: 0.8rem; }
          .stage-lyrics { padding: 2rem 5% 8rem; }
          .desktop-only { display: none; }
          .stage-nav { padding: 1rem 1.5rem; }
          .song-meta h1 { font-size: 1.2rem; }
          .stage-view-container {
            height: 100dvh;
            min-height: 100dvh;
            margin-top: 0;
          }
        }

        @media (max-width: 620px) {
          .stage-nav {
            padding: 0.8rem 0.85rem;
            gap: 0.6rem;
          }
          .close-x {
            width: 40px;
            height: 40px;
          }
          .song-meta {
            min-width: 0;
            flex: 1;
          }
          .song-meta h1 {
            font-size: 1rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .song-meta p {
            font-size: 0.75rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .header-controls {
            gap: 0.5rem;
          }
          .btn-edit {
            padding: 0.5rem 0.55rem;
            min-height: 40px;
          }
          .transpose-box { gap: 0.4rem; }
          .transpose-box button {
            width: 34px;
            height: 34px;
          }
          .current-key {
            width: 30px;
            font-size: 1.1rem;
          }
          .stage-lyrics {
            padding: 1.2rem 0.85rem 6.2rem;
          }
          .lyrics-content {
            font-size: 1.05rem;
            line-height: 1.55;
          }
          .edit-area {
            font-size: 1rem;
            padding: 1rem 0.9rem;
          }
          .import-row {
            grid-template-columns: 1fr;
          }
          .import-btn {
            width: 100%;
          }
          .stage-footer {
            padding: 0.75rem 0.85rem;
            gap: 0.5rem;
          }
          .play-trigger {
            width: 52px;
            height: 52px;
            border-radius: 26px;
          }
          .speed-ctrl {
            gap: 0.35rem;
          }
          .speed-ctrl button {
            padding: 0.45rem 0.55rem;
            font-size: 0.72rem;
          }
          .status-readout {
            font-size: 0.58rem;
            letter-spacing: 0.5px;
          }
        }
      `}</style>
    </div>
  );
}
