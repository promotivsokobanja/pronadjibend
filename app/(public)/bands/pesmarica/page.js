'use client';
import { Search, Music, BookOpen, ArrowLeft, ChevronDown, ChevronUp, Plus, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function PesmaricaPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [songs, setSongs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
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
      const qs = new URLSearchParams({ search: searchTerm, page: String(page) });
      const resp = await fetch(`/api/pesmarica?${qs}`, { cache: 'no-store' });
      const data = await resp.json();
      setSongs(data.songs || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchSongs();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchSongs();
  }, [page]);

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
          category: song.category || 'Muške Zabavne',
          type: song.type || 'Standard',
          bandId,
        }),
      });
      if (resp.ok) {
        setAddedSongs(prev => new Set([...prev, song.id]));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingId(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="pesmarica-container container">
      <div className="blob" style={{ top: '10%', right: '-10%' }}></div>

      <header className="page-header">
        <Link href="/bands" className="back-link"><Music size={14} /> Dashboard</Link>
        <div className="title-section">
          <h1><BookOpen size={36} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '12px' }} />
            Pesmarica</h1>
          <p className="text-muted">
            Globalna baza tekstova pesama. Pretražite, pregledajte tekstove i dodajte pesme u vaš repertoar.
          </p>
          <p className="stats-line">{total.toLocaleString()} pesama sa tekstovima</p>
        </div>

        <div className="search-section">
          <div className="search-box" ref={searchRef}>
            <Search size={20} className="text-muted" />
            <input
              type="text"
              placeholder="Pretraži po nazivu pesme ili izvođaču..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            {searchTerm && (
              <button className="clear-btn" onClick={() => setSearchTerm('')}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="songs-list">
        {isLoading ? (
          <div className="empty-state">
            <div className="loader"></div>
            <p>Učitavanje pesmarice...</p>
          </div>
        ) : songs.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} className="text-muted" />
            <p>{searchTerm ? 'Nema rezultata za pretragu.' : 'Unesite pojam za pretragu.'}</p>
          </div>
        ) : (
          <>
            {songs.map((song) => (
              <div key={song.id} className={`song-card glass-card ${expandedId === song.id ? 'expanded' : ''}`}>
                <div className="song-header" onClick={() => toggleExpand(song.id)}>
                  <div className="song-info">
                    <h3 className="song-title">{song.title}</h3>
                    <p className="song-artist">{song.artist}</p>
                  </div>
                  <div className="song-actions">
                    {bandId && (
                      <button
                        className={`add-btn ${addedSongs.has(song.id) ? 'added' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!addedSongs.has(song.id)) handleAddToRepertoire(song);
                        }}
                        disabled={addingId === song.id}
                        title={addedSongs.has(song.id) ? 'Već dodato' : 'Dodaj u moj repertoar'}
                      >
                        {addedSongs.has(song.id) ? <Check size={16} /> : <Plus size={16} />}
                        <span className="btn-label">
                          {addingId === song.id ? '...' : addedSongs.has(song.id) ? 'Dodato' : 'Dodaj'}
                        </span>
                      </button>
                    )}
                    <button className="expand-btn">
                      {expandedId === song.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
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
                <button
                  className="page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Prethodna
                </button>
                <span className="page-info">
                  Strana {page} od {pages}
                </span>
                <button
                  className="page-btn"
                  disabled={page >= pages}
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                >
                  Sledeća
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <style jsx>{`
        .pesmarica-container { padding-top: 8rem; padding-bottom: 6rem; min-height: 100vh; }

        .page-header { margin-bottom: 3rem; }
        .back-link { display: flex; align-items: center; gap: 0.5rem; color: #555; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2rem; transition: 0.3s; }
        .back-link:hover { color: white; }

        .title-section h1 { font-size: 3rem; font-weight: 800; letter-spacing: -2px; margin-bottom: 0.75rem; }
        .title-section .text-muted { font-size: 1rem; color: #888; margin-bottom: 0.5rem; }
        .stats-line { font-size: 0.8rem; color: var(--accent-primary); font-weight: 700; letter-spacing: 0.5px; }

        .search-section { margin-top: 2rem; }
        .search-box {
          display: flex; align-items: center; gap: 1rem;
          padding: 0.85rem 1.5rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          border-radius: 100px;
          max-width: 600px;
          transition: border-color 0.3s;
        }
        .search-box:focus-within { border-color: var(--accent-primary); }
        .search-box input {
          background: none; border: none; color: white; width: 100%;
          outline: none; font-size: 1rem;
        }
        .clear-btn {
          background: none; border: none; color: #555; cursor: pointer;
          display: flex; align-items: center; padding: 4px;
          border-radius: 50%; transition: 0.2s;
        }
        .clear-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

        .songs-list { display: flex; flex-direction: column; gap: 0.5rem; }

        .song-card {
          padding: 0; border: 1px solid var(--border);
          overflow: hidden; transition: all 0.3s ease;
        }
        .song-card.expanded { border-color: rgba(16, 185, 129, 0.3); }

        .song-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1.25rem 1.75rem; cursor: pointer; transition: background 0.2s;
        }
        .song-header:hover { background: rgba(255,255,255,0.02); }

        .song-info { flex: 1; min-width: 0; }
        .song-title { font-size: 1.15rem; font-weight: 700; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .song-artist { font-size: 0.85rem; color: #888; }

        .song-actions { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }

        .add-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 100px;
          background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2);
          color: var(--accent-primary); font-size: 0.75rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
        }
        .add-btn:hover:not(:disabled):not(.added) {
          background: var(--accent-primary); color: black; border-color: var(--accent-primary);
        }
        .add-btn.added {
          background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.4);
          cursor: default;
        }
        .add-btn:disabled { opacity: 0.5; cursor: wait; }

        .expand-btn {
          background: none; border: none; color: #555; cursor: pointer;
          display: flex; align-items: center; padding: 4px;
          transition: 0.2s;
        }
        .expand-btn:hover { color: white; }

        .lyrics-panel {
          border-top: 1px solid var(--border);
          padding: 1.5rem 1.75rem;
          background: rgba(0,0,0,0.3);
          max-height: 500px;
          overflow-y: auto;
        }
        .lyrics-text {
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem; line-height: 1.8; color: #ccc;
          white-space: pre-wrap; word-break: break-word;
          margin: 0;
        }

        .pagination {
          display: flex; justify-content: center; align-items: center;
          gap: 1.5rem; margin-top: 2rem; padding: 1rem 0;
        }
        .page-btn {
          padding: 8px 20px; border-radius: 100px;
          background: rgba(255,255,255,0.03); border: 1px solid var(--border);
          color: #aaa; font-size: 0.8rem; font-weight: 700;
          cursor: pointer; transition: 0.3s;
        }
        .page-btn:hover:not(:disabled) { border-color: var(--accent-primary); color: var(--accent-primary); }
        .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .page-info { font-size: 0.8rem; color: #666; font-weight: 600; }

        .empty-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 1rem; padding: 5rem 2rem; color: #444;
        }

        .btn-label { display: inline; }

        @media (max-width: 768px) {
          .title-section h1 { font-size: 2.2rem; }
          .search-box { max-width: 100%; }
          .song-header { padding: 1rem 1.25rem; }
          .lyrics-panel { padding: 1rem 1.25rem; }
          .btn-label { display: none; }
          .add-btn { padding: 6px 10px; }
        }
      `}</style>
    </div>
  );
}
