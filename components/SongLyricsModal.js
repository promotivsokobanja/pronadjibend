'use client';
import { ChevronUp, ChevronDown, Play, Pause, Check, X, Edit2, Music, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getCachedSong } from '../lib/offlineRepertoire';

const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function transposeText(text, offset) {
  if (!text || offset === 0) return text || '';
  return text.replace(/\[([A-G][#b]?)([^\[\]]*)\]/g, (match, root, suffix) => {
    const normRoot = root === 'Db' ? 'C#'
      : root === 'Eb' ? 'D#'
      : root === 'Gb' ? 'F#'
      : root === 'Ab' ? 'G#'
      : root === 'Bb' ? 'A#'
      : root;
    const index = keys.indexOf(normRoot);
    if (index === -1) return match;
    return `[${keys[(index + offset + 12) % 12]}${suffix}]`;
  });
}

function parseLine(line) {
  const chords = [];
  let text = '';
  let lastIdx = 0;
  const re = /\[([A-G][#b]?[^\[\]]*)\]/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    text += line.substring(lastIdx, m.index);
    chords.push({ name: m[1], pos: text.length });
    lastIdx = m.index + m[0].length;
  }
  text += line.substring(lastIdx);
  return { chords, text };
}

function buildChordLine(chords) {
  let result = '';
  let col = 0;
  for (const c of chords) {
    if (c.pos > col) result += '\u00A0'.repeat(c.pos - col);
    result += c.name;
    col = c.pos + c.name.length;
  }
  return result;
}

export default function SongLyricsModal({ songId, onClose }) {
  const [song, setSong] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [librarySongs, setLibrarySongs] = useState([]);
  const [importSongId, setImportSongId] = useState('');
  const [keyOffset, setKeyOffset] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef(null);
  const libraryLoadedRef = useRef(false);

  const fetchSong = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await fetch(`/api/songs/${songId}`);
      if (!resp.ok) throw new Error('fetch failed');
      const data = await resp.json();
      setSong(data);
      setEditContent(data.lyrics || '');
    } catch (err) {
      console.error(err);
      // Offline fallback: try IndexedDB cache
      try {
        const cached = await getCachedSong(songId);
        if (cached) {
          setSong(cached);
          setEditContent(cached.lyrics || '');
        }
      } catch { /* silent */ }
    } finally {
      setIsLoading(false);
    }
  }, [songId]);

  useEffect(() => { fetchSong(); }, [fetchSong]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    const html = document.documentElement;
    const prevBodyStyle = body.getAttribute('style') || '';
    const prevHtmlStyle = html.getAttribute('style') || '';
    body.style.setProperty('overflow', 'hidden', 'important');
    body.style.setProperty('position', 'fixed', 'important');
    body.style.setProperty('width', '100%', 'important');
    body.style.setProperty('height', '100%', 'important');
    html.style.setProperty('overflow', 'hidden', 'important');
    return () => {
      body.setAttribute('style', prevBodyStyle);
      html.setAttribute('style', prevHtmlStyle);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !isEditing) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isEditing, onClose]);

  // Lazy-load library songs only when entering edit mode
  useEffect(() => {
    if (!isEditing || libraryLoadedRef.current) return;
    libraryLoadedRef.current = true;
    const fetchLibrary = async () => {
      try {
        const resp = await fetch('/api/songs');
        if (!resp.ok) return;
        const data = await resp.json();
        setLibrarySongs((Array.isArray(data) ? data : []).filter((s) => String(s.id) !== String(songId) && s.lyrics));
      } catch {}
    };
    fetchLibrary();
  }, [isEditing, songId]);

  useEffect(() => {
    let interval;
    if (isScrolling) {
      interval = setInterval(() => {
        if (scrollRef.current) scrollRef.current.scrollTop += 1;
      }, 50 / scrollSpeed);
    }
    return () => clearInterval(interval);
  }, [isScrolling, scrollSpeed]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await fetch(`/api/songs/${songId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics: editContent }),
      });
      const updated = { ...song, lyrics: editContent };
      setSong(updated);
      setIsEditing(false);
    } catch {
      alert('Greška pri čuvanju');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportLyrics = async (sid) => {
    const sourceId = sid || importSongId;
    if (!sourceId) return;
    try {
      const resp = await fetch(`/api/songs/${sourceId}`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (data?.lyrics) setEditContent(data.lyrics);
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="slm-overlay" role="dialog" aria-modal="true">
        <div className="slm-loading"><div className="loader" /></div>
        <style jsx>{`${modalStyles}`}</style>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="slm-overlay" role="dialog" aria-modal="true">
        <div className="slm-loading">
          <p style={{ color: '#888' }}>Pesma nije pronađena.</p>
          <button className="slm-close-floating" onClick={onClose}><X size={20} /></button>
        </div>
        <style jsx>{`${modalStyles}`}</style>
      </div>
    );
  }

  return (
    <div className="slm-overlay" role="dialog" aria-modal="true" aria-label={`Tekst pesme: ${song.title}`}>
      <header className="slm-nav">
        <div className="slm-meta">
          <h1>{song.title}</h1>
          <p>{song.artist}</p>
        </div>
        <div className="slm-controls">
          <button className={`slm-btn-edit ${isEditing ? 'active' : ''}`} onClick={() => isEditing ? handleSave() : setIsEditing(true)} disabled={isSaving}>
            {isEditing ? <Check size={18} /> : <Edit2 size={18} />}
            <span className="slm-desktop-only">{isSaving ? 'ČUVAM...' : isEditing ? 'SAČUVAJ' : 'IZMENI'}</span>
          </button>
          {!isEditing && (
            <div className="slm-transpose">
              <button onClick={() => setKeyOffset((p) => p - 1)}>-b</button>
              <div className="slm-key">{keys[(keys.indexOf(song.key || 'C') + keyOffset + 12) % 12]}</div>
              <button onClick={() => setKeyOffset((p) => p + 1)}>+#</button>
            </div>
          )}
          <button type="button" className="slm-close-x" onClick={onClose} aria-label="Zatvori" title="Zatvori (Esc)">
            <X size={20} />
          </button>
        </div>
      </header>

      <main className="slm-lyrics" ref={scrollRef} style={isEditing ? { display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.5rem 5%' } : undefined}>
        {isEditing ? (
          <div className="slm-edit-layout">
            <div className="slm-edit-actions">
              <button type="button" className="slm-edit-btn ghost" onClick={() => setIsEditing(false)}>
                <X size={16} /> Izađi iz unosa
              </button>
            </div>
            {librarySongs.length > 0 && (
              <div className="slm-import-row">
                <select
                  value={importSongId}
                  onChange={async (e) => { const v = e.target.value; setImportSongId(v); await handleImportLyrics(v); }}
                  className="slm-import-select"
                >
                  <option value="">Preuzmi tekst iz druge pesme...</option>
                  {librarySongs.map((s) => (
                    <option key={s.id} value={s.id}>{s.title} — {s.artist}</option>
                  ))}
                </select>
                <button type="button" className="slm-import-btn" onClick={() => handleImportLyrics()} disabled={!importSongId}>
                  Preuzmi ponovo
                </button>
              </div>
            )}
            <div className="slm-chord-help">
              <strong>Kako upisati akorde:</strong> Akord stavite u uglaste zagrade <code>[</code> <code>]</code> ispred reči nad kojom treba da stoji.
              <br />Primer: <code>[Am]Život ide [C]dalje [G7]zauvek</code>
              <br />Podržano: <code>[C]</code> <code>[Am]</code> <code>[G7]</code> <code>[F#m]</code> <code>[Bb]</code> <code>[Cmaj7]</code> <code>[Dsus4]</code> itd.
              <br />Akord će se prikazati <em>iznad teksta</em> i menjati se sa transpozicijom (-b / +#).
            </div>
            <textarea
              className="slm-edit-area"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder={"Primer unosa:\n\n[Am]Od kada me [D#]vise ne [Fm]volis\n[D#]zivim da [G#]prezivim\n\nMoja vilo, sunce premilo\ngdje si sinoc spavala"}
            />
          </div>
        ) : (
          <pre className="slm-lyrics-content">
            {song.lyrics ? (
              transposeText(song.lyrics, keyOffset).replace(/\r/g, '').split('\n').map((line, i) => {
                const { chords, text } = parseLine(line);
                return (
                  <div key={i} className="slm-line">
                    {chords.length > 0 && (
                      <div className="slm-chord-line">{buildChordLine(chords)}</div>
                    )}
                    <div className="slm-text-line">{text || '\u00A0'}</div>
                  </div>
                );
              })
            ) : (
              <div className="slm-no-lyrics">
                <Music size={48} />
                <p>Tekst za ovu pesmu još nije dodat.</p>
                <button className="btn btn-primary" onClick={() => setIsEditing(true)}>DODAJ TEKST</button>
              </div>
            )}
          </pre>
        )}
      </main>

      {!isEditing && (
        <footer className="slm-footer">
          <div className="slm-speed">
            <button onClick={() => setScrollSpeed((s) => Math.max(0.25, +(s - 0.25).toFixed(2)))}>−</button>
            <span className="slm-speed-val">x{scrollSpeed}</span>
            <button onClick={() => setScrollSpeed((s) => Math.min(4, +(s + 0.25).toFixed(2)))}>+</button>
          </div>
          <button className="slm-play" onClick={() => setIsScrolling(!isScrolling)}>
            {isScrolling ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
          </button>
          <div className="slm-status">
            <span>{isScrolling ? 'SKROLOVANJE' : 'PAUZIRANO'}</span>
            <span>KEY OFFSET: {keyOffset > 0 ? `+${keyOffset}` : keyOffset}</span>
          </div>
        </footer>
      )}

      <style jsx>{`${modalStyles}`}</style>
    </div>
  );
}

const modalStyles = `
  .slm-overlay {
    position: fixed;
    inset: 0;
    height: 100vh;
    height: 100dvh;
    min-height: -webkit-fill-available;
    background: #000;
    color: #fff;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 1500;
    animation: slm-fade 0.18s ease;
    -webkit-overflow-scrolling: touch;
    touch-action: manipulation;
  }
  @keyframes slm-fade { from { opacity: 0; } to { opacity: 1; } }
  .slm-loading { height: 100%; display: flex; align-items: center; justify-content: center; }
  .slm-nav {
    padding: 1.5rem 3rem;
    padding-top: max(1.5rem, env(safe-area-inset-top));
    padding-left: max(3rem, env(safe-area-inset-left));
    padding-right: max(3rem, env(safe-area-inset-right));
    border-bottom: 1px solid #1a1a1e;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #000;
    position: sticky;
    top: 0;
    z-index: 8;
    flex-shrink: 0;
  }
  .slm-meta h1 { font-size: 1.5rem; font-weight: 800; margin: 0; }
  .slm-meta p { font-size: 0.9rem; color: #555; margin: 0; font-weight: 600; }
  .slm-controls { display: flex; align-items: center; gap: 2rem; }
  .slm-btn-edit { background: #111; border: 1px solid #222; color: #888; padding: 0.6rem 1.25rem; border-radius: 8px; display: flex; align-items: center; gap: 0.75rem; font-weight: 700; cursor: pointer; transition: 0.3s; }
  .slm-btn-edit.active { border-color: var(--accent-primary); color: var(--accent-primary); background: rgba(16,185,129,0.05); }
  .slm-btn-edit:hover { background: #222; }
  .slm-close-x {
    width: 44px; height: 44px; border-radius: 999px;
    border: 1px solid #2a2a2a; background: #0d0d0d; color: #e2e8f0;
    cursor: pointer; transition: 0.2s ease; flex-shrink: 0; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .slm-close-x:hover { background: #ef4444; border-color: #ef4444; color: #000; transform: scale(1.04); }
  .slm-close-x:active { transform: scale(0.98); }
  .slm-close-floating { position: absolute; top: 1rem; right: 1rem; background: #111; border: 1px solid #333; color: #fff; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .slm-transpose { display: flex; align-items: center; gap: 1rem; }
  .slm-transpose button { background: #111; border: 1px solid #222; color: #fff; width: 40px; height: 40px; border-radius: 8px; cursor: pointer; font-weight: 800; }
  .slm-key { font-size: 1.5rem; font-weight: 950; color: var(--accent-primary); width: 40px; text-align: center; }
  .slm-lyrics {
    flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain; padding: 4rem 10% 8rem;
    padding-bottom: max(8rem, calc(8rem + env(safe-area-inset-bottom)));
    scroll-behavior: smooth; position: relative;
    scrollbar-width: thin; scrollbar-color: rgba(167,139,250,0.5) transparent;
    touch-action: pan-y;
  }
  .slm-lyrics::-webkit-scrollbar { width: 8px; }
  .slm-lyrics::-webkit-scrollbar-track { background: transparent; }
  .slm-lyrics::-webkit-scrollbar-thumb { background: rgba(167,139,250,0.35); border-radius: 999px; border: 2px solid transparent; background-clip: padding-box; }
  .slm-lyrics::-webkit-scrollbar-thumb:hover { background: rgba(167,139,250,0.6); background-clip: padding-box; border: 2px solid transparent; }
  .slm-lyrics-content { font-family: 'JetBrains Mono', 'Fira Mono', 'Consolas', ui-monospace, monospace; font-size: 1.1rem; line-height: 1.5; white-space: pre-wrap; font-weight: 500; }
  .slm-line { margin-bottom: 0.35rem; white-space: pre-wrap; word-break: break-word; min-height: 1.3em; }
  .slm-chord-line { color: #8b5cf6; font-weight: 800; font-size: 0.95em; line-height: 1.3; white-space: pre; user-select: all; }
  .slm-text-line { line-height: 1.5; }
  .slm-no-lyrics { text-align: center; padding: 5rem; display: flex; flex-direction: column; align-items: center; gap: 2rem; color: #444; }
  .slm-edit-layout { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 0.75rem; }
  .slm-edit-actions { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; flex-shrink: 0; }
  .slm-edit-btn { display: inline-flex; align-items: center; gap: 0.4rem; background: #111; border: 1px solid #2a2a2a; color: #d1d5db; border-radius: 8px; padding: 0.55rem 0.8rem; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; cursor: pointer; }
  .slm-edit-btn:hover { border-color: #00ff00; color: #00ff00; }
  .slm-edit-btn.ghost:hover { border-color: #f59e0b; color: #f59e0b; }
  .slm-import-row { display: grid; grid-template-columns: 1fr auto; gap: 0.6rem; padding: 0.35rem 0; flex-shrink: 0; }
  .slm-import-select { background: #0b0b0b; border: 1px solid #222; color: #d1d5db; border-radius: 8px; padding: 0.6rem 0.75rem; outline: none; font-size: 0.85rem; }
  .slm-import-select:focus { border-color: #00ff00; }
  .slm-import-btn { background: #111; border: 1px solid #2a2a2a; color: #cbd5e1; border-radius: 8px; padding: 0.6rem 0.9rem; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; cursor: pointer; }
  .slm-import-btn:hover:not(:disabled) { border-color: #00ff00; color: #00ff00; }
  .slm-import-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .slm-chord-help { background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.25); border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.78rem; line-height: 1.6; color: #a5b4fc; flex-shrink: 0; }
  .slm-chord-help code { background: rgba(139,92,246,0.15); padding: 1px 5px; border-radius: 3px; font-family: monospace; font-weight: 700; color: #c4b5fd; }
  .slm-chord-help strong { color: #e0e7ff; }
  .slm-chord-help em { color: #8b5cf6; font-style: normal; font-weight: 700; }
  .slm-edit-area { width: 100%; flex: 1; min-height: 0; background: #050505; border: 1px dashed #333; color: #fff; font-family: monospace; font-size: 1.25rem; padding: 2rem; outline: none; resize: none; overflow-y: auto; -webkit-overflow-scrolling: touch; scrollbar-width: thin; scrollbar-color: rgba(167,139,250,0.5) transparent; touch-action: auto; user-select: text; -webkit-user-select: text; }
  .slm-edit-area::-webkit-scrollbar { width: 8px; }
  .slm-edit-area::-webkit-scrollbar-track { background: transparent; }
  .slm-edit-area::-webkit-scrollbar-thumb { background: rgba(167,139,250,0.35); border-radius: 999px; border: 2px solid transparent; background-clip: padding-box; }
  .slm-footer {
    padding: 1.5rem 3rem; background: #000; border-top: 1px solid #1a1a1e;
    padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
    padding-left: max(3rem, env(safe-area-inset-left));
    padding-right: max(3rem, env(safe-area-inset-right));
    display: flex; justify-content: space-between; align-items: center;
    flex-shrink: 0;
  }
  .slm-speed { display: flex; align-items: center; gap: 0.4rem; }
  .slm-speed button { background: #111; border: 1px solid #222; color: #aaa; width: 38px; height: 38px; border-radius: 8px; font-weight: 800; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.15s; }
  .slm-speed button:hover { border-color: var(--accent-primary); color: var(--accent-primary); }
  .slm-speed-val { font-size: 0.85rem; font-weight: 800; color: #8b5cf6; min-width: 38px; text-align: center; }
  .slm-play { background: var(--accent-primary); color: #000; border: none; width: 60px; height: 60px; border-radius: 30px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
  .slm-play:hover { transform: scale(1.05); }
  .slm-status { text-align: right; display: flex; flex-direction: column; gap: 4px; font-size: 0.65rem; font-weight: 800; color: #333; letter-spacing: 1px; }

  @media (max-width: 968px) {
    .slm-lyrics-content { font-size: 1.05rem; line-height: 1.5; }
    .slm-line { margin-bottom: 0.35rem; }
    .slm-lyrics { padding: 2rem 5% 8rem; }
    .slm-desktop-only { display: none; }
    .slm-nav { padding: 1rem 1.5rem; }
    .slm-meta h1 { font-size: 1.2rem; }
  }
  @media (max-width: 620px) {
    .slm-nav {
      padding: 0.8rem 0.85rem; gap: 0.6rem;
      padding-top: max(0.8rem, env(safe-area-inset-top));
    }
    .slm-close-x { width: 44px; height: 44px; min-width: 44px; }
    .slm-meta { min-width: 0; flex: 1; overflow: hidden; }
    .slm-meta h1 { font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .slm-meta p { font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .slm-controls { gap: 0.5rem; flex-shrink: 0; }
    .slm-btn-edit { padding: 0.5rem 0.55rem; min-height: 44px; min-width: 44px; }
    .slm-transpose { gap: 0.4rem; }
    .slm-transpose button { width: 36px; height: 36px; min-width: 36px; }
    .slm-key { width: 30px; font-size: 1.1rem; }
    .slm-lyrics {
      padding: 1.2rem 0.85rem 6.2rem;
      padding-bottom: max(6.2rem, calc(6.2rem + env(safe-area-inset-bottom)));
    }
    .slm-lyrics-content { font-size: 0.9rem; line-height: 1.4; }
    .slm-edit-area { font-size: 16px; padding: 1rem 0.9rem; }
    .slm-import-row { grid-template-columns: 1fr; }
    .slm-import-btn { width: 100%; min-height: 44px; }
    .slm-import-select { min-height: 44px; font-size: 16px; }
    .slm-footer {
      padding: 0.75rem 0.85rem; gap: 0.5rem;
      padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
    }
    .slm-play { width: 52px; height: 52px; border-radius: 26px; }
    .slm-speed { gap: 0.3rem; }
    .slm-speed button { width: 34px; height: 34px; font-size: 1rem; }
    .slm-status { font-size: 0.58rem; letter-spacing: 0.5px; }
  }

  @supports (-webkit-touch-callout: none) {
    .slm-overlay { height: -webkit-fill-available; }
  }
`;
