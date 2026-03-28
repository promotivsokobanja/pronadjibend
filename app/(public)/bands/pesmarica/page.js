'use client';
import { Search, Music, BookOpen, ChevronDown, ChevronUp, Plus, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['Sve', 'Zabavne', 'Narodne', 'Strane'];
const ALPHABET = 'ABCČĆDĐEFGHIJKLMNOPRSTUVZŽ'.split('');

export default function PesmaricaPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('Sve');
  const [activeLetter, setActiveLetter] = useState('');
  const [songs, setSongs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [counts, setCounts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [bandId, setBandId] = useState(null);
  const [addedSongs, setAddedSongs] = useState(new Set());
  const [addingId, setAddingId] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!r.ok) { router.replace('/login'); return; }
        const { user } = await r.json();
        if (user?.bandId) setBandId(user.bandId);
      } catch { /* ignore */ }
    })();
  }, [router]);

  const fetchSongs = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams({
        search: searchTerm,
        category,
        letter: activeLetter,
        page: String(page),
      });
      const resp = await fetch(`/api/pesmarica?${qs}`, { cache: 'no-store' });
      const data = await resp.json();
      setSongs(data.songs || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      if (data.counts) setCounts(data.counts);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, category, activeLetter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchSongs();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, category, activeLetter]);

  useEffect(() => {
    fetchSongs();
  }, [page]);

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setActiveLetter('');
    setPage(1);
  };

  const handleLetterChange = (letter) => {
    setActiveLetter(activeLetter === letter ? '' : letter);
    setSearchTerm('');
    setPage(1);
  };

  const handleAddToRepertoire = async (song) => {
    if (!bandId || addingId) return;
    setAddingId(song.id);
    try {
      const resp = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: song.title,
          artist: song.artist,
          lyrics: song.lyrics,
          category: song.category || 'Zabavne',
          type: 'Standard',
          bandId,
        }),
      });
      if (resp.ok) setAddedSongs(prev => new Set([...prev, song.id]));
    } catch (err) {
      console.error(err);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="pesmarica-container container">
      <div className="blob" style={{ top: '10%', right: '-10%' }}></div>

      <header className="page-header">
        <Link href="/bands" className="back-link"><Music size={14} /> Dashboard</Link>
        <div className="title-row">
          <h1><BookOpen size={32} className="inline-icon" /> Pesmarica</h1>
          <span className="total-badge">{(counts['Sve'] || total).toLocaleString()} pesama</span>
        </div>

        {/* Category Tabs */}
        <div className="cat-tabs">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`cat-tab ${category === cat ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat)}
            >
              {cat}
              {counts[cat] != null && <span className="cat-count">{counts[cat].toLocaleString()}</span>}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="search-box" ref={searchRef}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Pretraži po nazivu ili izvođaču..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setActiveLetter(''); }}
          />
          {searchTerm && (
            <button className="clear-btn" onClick={() => setSearchTerm('')}><X size={16} /></button>
          )}
        </div>

        {/* Alphabet Bar */}
        <div className="alpha-bar">
          {ALPHABET.map(l => (
            <button
              key={l}
              className={`alpha-btn ${activeLetter === l ? 'active' : ''}`}
              onClick={() => handleLetterChange(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </header>

      <main className="songs-list">
        {isLoading ? (
          <div className="empty-state"><div className="loader"></div><p>Učitavanje...</p></div>
        ) : songs.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} className="text-muted" />
            <p>{searchTerm || activeLetter ? 'Nema rezultata.' : 'Izaberite slovo ili pretražite.'}</p>
          </div>
        ) : (
          <>
            <div className="results-info">
              {total.toLocaleString()} rezultata
              {activeLetter && <> na slovo <strong>{activeLetter}</strong></>}
              {searchTerm && <> za <strong>&ldquo;{searchTerm}&rdquo;</strong></>}
              {category !== 'Sve' && <> u kategoriji <strong>{category}</strong></>}
            </div>

            {songs.map((song) => (
              <div key={song.id} className={`song-card ${expandedId === song.id ? 'expanded' : ''}`}>
                <div className="song-header" onClick={() => setExpandedId(expandedId === song.id ? null : song.id)}>
                  <div className="song-info">
                    <span className="song-title">{song.title}</span>
                    <span className="song-sep">—</span>
                    <span className="song-artist">{song.artist}</span>
                  </div>
                  <div className="song-actions">
                    <span className={`cat-badge ${(song.category || '').toLowerCase()}`}>
                      {song.category}
                    </span>
                    {bandId && (
                      <button
                        className={`add-btn ${addedSongs.has(song.id) ? 'added' : ''}`}
                        onClick={(e) => { e.stopPropagation(); if (!addedSongs.has(song.id)) handleAddToRepertoire(song); }}
                        disabled={addingId === song.id}
                        title={addedSongs.has(song.id) ? 'Dodato u repertoar' : 'Dodaj u moj repertoar'}
                      >
                        {addedSongs.has(song.id) ? <Check size={14} /> : <Plus size={14} />}
                      </button>
                    )}
                    <span className="expand-icon">
                      {expandedId === song.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </span>
                  </div>
                </div>
                {expandedId === song.id && song.lyrics && (
                  <div className="lyrics-panel">
                    <pre className="lyrics-text">{song.lyrics}</pre>
                  </div>
                )}
              </div>
            ))}

            {pages > 1 && (
              <div className="pagination">
                <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prethodna</button>
                <span className="page-info">{page} / {pages}</span>
                <button className="page-btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Sledeća →</button>
              </div>
            )}
          </>
        )}
      </main>

      <style jsx>{`
        .pesmarica-container { padding-top: 8rem; padding-bottom: 6rem; min-height: 100vh; }

        .page-header { margin-bottom: 2rem; }
        .back-link { display: flex; align-items: center; gap: 0.5rem; color: #555; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1.5rem; transition: 0.3s; }
        .back-link:hover { color: white; }

        .title-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .title-row h1 { font-size: 2.8rem; font-weight: 800; letter-spacing: -2px; display: flex; align-items: center; gap: 10px; }
        .inline-icon { vertical-align: middle; }
        .total-badge { background: rgba(16,185,129,0.1); color: var(--accent-primary); padding: 4px 14px; border-radius: 100px; font-size: 0.8rem; font-weight: 800; }

        /* Category Tabs */
        .cat-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .cat-tab {
          padding: 8px 18px; border-radius: 100px; font-size: 0.8rem; font-weight: 700;
          border: 1px solid var(--border); background: rgba(255,255,255,0.02);
          color: #888; cursor: pointer; transition: all 0.25s; display: flex; align-items: center; gap: 8px;
        }
        .cat-tab:hover { border-color: #555; color: #ccc; }
        .cat-tab.active { background: var(--accent-primary); color: black; border-color: var(--accent-primary); }
        .cat-tab.active .cat-count { background: rgba(0,0,0,0.2); color: black; }
        .cat-count { font-size: 0.65rem; background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 100px; color: #666; }

        /* Search */
        .search-box {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.7rem 1.25rem; background: rgba(255,255,255,0.03);
          border: 1px solid var(--border); border-radius: 100px;
          margin-bottom: 1rem; transition: border-color 0.3s;
        }
        .search-box:focus-within { border-color: var(--accent-primary); }
        .search-icon { color: #555; flex-shrink: 0; }
        .search-box input { background: none; border: none; color: white; width: 100%; outline: none; font-size: 0.95rem; }
        .clear-btn { background: none; border: none; color: #555; cursor: pointer; display: flex; padding: 4px; border-radius: 50%; }
        .clear-btn:hover { color: #ef4444; }

        /* Alphabet */
        .alpha-bar {
          display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 0.5rem;
        }
        .alpha-btn {
          width: 34px; height: 34px; border-radius: 8px; font-size: 0.75rem; font-weight: 800;
          border: 1px solid var(--border); background: rgba(255,255,255,0.02);
          color: #666; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
        }
        .alpha-btn:hover { border-color: #555; color: #ccc; }
        .alpha-btn.active { background: var(--accent-primary); color: black; border-color: var(--accent-primary); }

        /* Results */
        .results-info { font-size: 0.8rem; color: #666; margin-bottom: 1rem; padding-left: 4px; }
        .results-info strong { color: #aaa; }

        .songs-list { display: flex; flex-direction: column; gap: 2px; }

        .song-card { border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; transition: all 0.2s; background: rgba(255,255,255,0.01); }
        .song-card.expanded { border-color: rgba(16,185,129,0.3); }
        .song-card:hover { background: rgba(255,255,255,0.02); }

        .song-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0.9rem 1.25rem; cursor: pointer; gap: 1rem;
        }

        .song-info { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; overflow: hidden; }
        .song-title { font-weight: 700; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .song-sep { color: #444; flex-shrink: 0; }
        .song-artist { color: #888; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .song-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

        .cat-badge {
          font-size: 0.6rem; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;
          padding: 3px 10px; border-radius: 100px;
        }
        .cat-badge.zabavne { background: rgba(59,130,246,0.1); color: #60a5fa; }
        .cat-badge.narodne { background: rgba(234,179,8,0.1); color: #facc15; }
        .cat-badge.strane { background: rgba(168,85,247,0.1); color: #c084fc; }

        .add-btn {
          width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2);
          color: var(--accent-primary); cursor: pointer; transition: all 0.2s;
        }
        .add-btn:hover:not(:disabled):not(.added) { background: var(--accent-primary); color: black; border-color: var(--accent-primary); }
        .add-btn.added { background: rgba(16,185,129,0.2); border-color: rgba(16,185,129,0.5); cursor: default; }
        .add-btn:disabled { opacity: 0.4; cursor: wait; }

        .expand-icon { color: #444; display: flex; }

        .lyrics-panel {
          border-top: 1px solid #d0d0d0; padding: 1.25rem 1.5rem;
          background: #e8e8e8; max-height: 450px; overflow-y: auto;
          border-radius: 0 0 var(--radius-md) var(--radius-md);
        }
        .lyrics-text { font-family: 'Inter', sans-serif; font-size: 0.92rem; line-height: 1.8; color: #1a1a1a; white-space: pre-wrap; word-break: break-word; margin: 0; }

        .pagination { display: flex; justify-content: center; align-items: center; gap: 1.5rem; margin-top: 2rem; padding: 1rem 0; }
        .page-btn {
          padding: 8px 20px; border-radius: 100px;
          background: rgba(255,255,255,0.03); border: 1px solid var(--border);
          color: #aaa; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: 0.3s;
        }
        .page-btn:hover:not(:disabled) { border-color: var(--accent-primary); color: var(--accent-primary); }
        .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .page-info { font-size: 0.8rem; color: #555; font-weight: 700; }

        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 5rem 2rem; color: #444; }

        @media (max-width: 768px) {
          .title-row h1 { font-size: 2rem; }
          .alpha-btn { width: 28px; height: 28px; font-size: 0.65rem; }
          .song-info { flex-direction: column; align-items: flex-start; gap: 2px; }
          .song-sep { display: none; }
          .cat-badge { display: none; }
        }
      `}</style>
    </div>
  );
}
