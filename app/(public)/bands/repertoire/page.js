'use client';
import { Music, Search, Plus, Trash2, ArrowLeft, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { songs as allSongs } from '../../../../lib/songs';

export default function RepertoirePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Muške Zabavne');
  const [songs, setSongs] = useState([]);
  const [counts, setCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [globalMatches, setGlobalMatches] = useState([]);
  const [bandId, setBandId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!r.ok) return;
        const { user } = await r.json();
        if (user?.bandId) setBandId(user.bandId);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const fetchData = useCallback(async () => {
    if (!bandId) {
      setSongs([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const qs = new URLSearchParams({
        category: activeTab,
        search: searchTerm,
        bandId,
      }).toString();
      const resp = await fetch(`/api/songs?${qs}`, { cache: 'no-store' });
      const data = await resp.json();
      setSongs(Array.isArray(data) ? data : []);

      if (searchTerm.length > 1 && Array.isArray(data)) {
        const matches = allSongs.filter(s => 
          (s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
           s.artist?.toLowerCase().includes(searchTerm.toLowerCase())) &&
          !data.some(existing => existing.title === s.title && existing.artist === s.artist)
        ).slice(0, 10);
        setGlobalMatches(matches);
      } else {
        setGlobalMatches([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [bandId, activeTab, searchTerm]);

  const fetchCounts = useCallback(async () => {
    if (!bandId) return;
    try {
      const resp = await fetch(`/api/songs/counts?bandId=${encodeURIComponent(bandId)}`, { cache: 'no-store' });
      const data = await resp.json();
      setCounts(typeof data === 'object' && data && !data.error ? data : {});
    } catch (err) {
      console.error(err);
    }
  }, [bandId]);

  const handleQuickAdd = async (masterSong) => {
    if (!bandId) return;
    try {
      const resp = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: masterSong.title,
          artist: masterSong.artist,
          category: masterSong.type,
          type: 'Standard',
          bandId
        })
      });
      if (resp.ok) {
        fetchData();
        fetchCounts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (bandId) fetchCounts();
  }, [bandId, fetchCounts]);

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const categories = ['Muške Zabavne', 'Ženske Zabavne', 'Muške Narodne', 'Ženske Narodne', 'Starije Zabavne'];

  const removeSong = async (id) => {
    if (!confirm('Da li ste sigurni da želite da obrišete ovu pesmu?')) return;

    const previousSongs = songs;
    setSongs((prev) => prev.filter((s) => s.id !== id));

    try {
      const qs = bandId ? `?bandId=${encodeURIComponent(bandId)}` : '';
      const resp = await fetch(`/api/songs/${encodeURIComponent(id)}${qs}`, {
        method: 'DELETE',
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        throw new Error(data?.error || 'Brisanje pesme nije uspelo.');
      }

      fetchCounts();
    } catch (err) {
      console.error(err);
      setSongs(previousSongs);
      alert(err?.message || 'Greška pri brisanju pesme.');
    }
  };

  return (
    <div className="repertoire-container container">
      <div className="blob" style={{ top: '10%', right: '-10%' }}></div>
      <header className="page-header">
        <button
          type="button"
          className="back-link"
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push('/bands');
            }
          }}
        >
          <ArrowLeft size={14} /> NAZAD
        </button>
        <div className="title-section">
          <h1>Upravljanje <span className="gradient-text">Repertoarom</span></h1>
          <p className="text-muted">Personalizovana baza pesama. Kliknite na ime za brzi pregled.</p>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <Search size={18} aria-hidden />
            <input 
              type="text" 
              placeholder="Pretraži globalnu bazu..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <Link href="/bands/song/new">
            <button className="btn btn-primary"><Plus size={18} /> Dodaj Novu</button>
          </Link>
        </div>
        <div className="gender-tabs-container">
          <div className="gender-tabs">
            {categories.map(cat => (
              <button 
                key={cat} 
                className={`tab-btn ${activeTab === cat ? 'active' : ''}`} 
                onClick={() => setActiveTab(cat)}
              >
                {cat} ({counts[cat] || 0})
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="repertoire-list glass-card">
        <div className="list-header desktop-only">
          <span className="col-title">PESMA I IZVOĐAČ</span>
          <span className="col-tonality">STATUS</span>
          <span className="col-genre">ŽANR</span>
          <span className="col-actions">UPRAVLJANJE</span>
        </div>
        
        <div className="song-rows">
          {isLoading ? (
            <div className="empty-state"><div className="loader"></div><p>Učitavanje baze...</p></div>
          ) : (
            <>
              {globalMatches.length > 0 && (
                <div className="suggestions-divider">
                  <span>Predloženo iz baze (klikni za brzi dodatak)</span>
                </div>
              )}
              {globalMatches.map((m) => (
                <div key={`global-${m.id}`} className="song-row suggestion-row" onClick={() => handleQuickAdd(m)}>
                  <div className="col-title">
                    <p className="song-name clickable-title highlight">{m.title}</p>
                    <p className="song-artist">{m.artist}</p>
                  </div>
                  <div className="col-tonality">
                    <span className="tonality-pill global">DODAJ U LISTU</span>
                  </div>
                  <div className="col-genre"><span className="genre-label glass">{m.type}</span></div>
                  <div className="col-actions">
                     <Plus size={18} className="text-muted" />
                  </div>
                </div>
              ))}

              {songs.map((song) => (
                <div key={song.id} className="song-row">
                  <div className="col-title">
                    <Link href={`/bands/song/${song.id}`}>
                      <p className="song-name clickable-title">{song.title}</p>
                    </Link>
                    <p className="song-artist">{song.artist || 'Evergreen / Folk'}</p>
                  </div>
                  <div className="col-tonality">
                    <Link href={`/bands/song/${song.id}`}>
                      <span className={`tonality-pill ${song.lyrics ? 'success' : 'warning'}`} style={{ cursor: 'pointer' }}>
                        {song.lyrics ? 'TEKST PRISUTAN' : 'BEZ TEKSTA'}
                      </span>
                    </Link>
                  </div>
                  <div className="col-genre"><span className="genre-label">{song.type || 'Standard'}</span></div>
                  <div className="col-actions">
                    <Link href={`/bands/song/${song.id}`} className="action-btn" title="Uredi"><Edit2 size={16} /></Link>
                    <button className="action-btn delete" onClick={() => removeSong(song.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              {songs.length === 0 && globalMatches.length === 0 && (
                <div className="empty-state">
                  <Music size={48} className="text-muted" />
                  <p>Nema pesama u ovoj kategoriji.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <style jsx>{`
        .repertoire-container { padding-top: 8rem; padding-bottom: 6rem; min-height: 100vh; }
        .page-header { margin-bottom: 4rem; position: relative; z-index: 2; }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #334155;
          font-weight: 800;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 2rem;
          padding: 0.45rem 0.7rem;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(255, 255, 255, 0.85);
          position: relative;
          z-index: 3;
          transition: 0.2s ease;
        }
        .back-link:hover { color: #0f172a; border-color: rgba(100, 116, 139, 0.75); }
        .title-section h1 { font-size: 3.5rem; font-weight: 800; margin-bottom: 1.5rem; letter-spacing: -2px; }
        .header-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 3rem; gap: 2rem; flex-wrap: wrap; }
        .search-box { flex: 1; min-width: 300px; max-width: 500px; display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1.5rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 100px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); }
        .search-box input { background: none; border: none; color: #0f172a; width: 100%; outline: none; font-size: 0.95rem; font-weight: 600; }
        .search-box input::placeholder { color: #64748b; font-weight: 500; }
        .search-box svg { color: #64748b; flex-shrink: 0; }
        
        .gender-tabs-container { overflow-x: auto; margin-top: 2.5rem; padding-bottom: 1rem; -webkit-overflow-scrolling: touch; }
        .gender-tabs { display: flex; gap: 0.6rem; min-width: max-content; }
        .tab-btn { background: rgba(255,255,255,0.03); border: 1px solid var(--border); color: #888; padding: 0.6rem 1.25rem; border-radius: 100px; cursor: pointer; transition: 0.3s; font-weight: 700; font-size: 0.75rem; white-space: nowrap; }
        .tab-btn.active { background: var(--accent-primary); color: black; border-color: var(--accent-primary); }
        
        .repertoire-list { padding: 0; border: 1px solid var(--border); overflow: hidden; margin-top: 2rem; }
        .list-header { display: grid; grid-template-columns: 2fr 1fr 1fr 120px; padding: 1.5rem 2.5rem; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border); font-size: 0.7rem; font-weight: 800; color: #555; letter-spacing: 1.5px; }
        .song-row { display: grid; grid-template-columns: 2fr 1fr 1fr 120px; padding: 1.25rem 2.5rem; border-bottom: 1px solid var(--border); align-items: center; transition: 0.3s ease; }
        .song-name { font-size: 1.15rem; font-weight: 700; transition: 0.2s; }
        .clickable-title:hover { color: var(--accent-primary); }
        
        .suggestions-divider { padding: 1rem 2.5rem; background: rgba(16, 185, 129, 0.05); border-bottom: 1px solid rgba(16, 185, 129, 0.1); font-size: 0.65rem; font-weight: 800; color: var(--accent-primary); letter-spacing: 1px; text-transform: uppercase; }
        .suggestion-row { background: rgba(255,255,255,0.01); border-bottom: 1px dashed var(--border); cursor: pointer; }
        .suggestion-row:hover { background: rgba(16, 185, 129, 0.05); }
        .highlight { color: var(--accent-primary); }
        
        .tonality-pill { background: rgba(16, 185, 129, 0.1); color: var(--accent-primary); padding: 4px 12px; border-radius: 100px; font-size: 0.75rem; font-weight: 800; transition: 0.3s; }
        .tonality-pill.success { background: rgba(16, 185, 129, 0.1); color: var(--accent-primary); }
        .tonality-pill.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .tonality-pill.global { background: transparent; border: 1px solid var(--accent-primary); }
        
        .genre-label { font-size: 0.8rem; color: var(--text-muted); }
        .genre-label.glass { background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 4px; }
        
        .action-btn { color: #555; transition: 0.2s; padding: 8px; border-radius: 6px; }
        .action-btn:hover { color: white; background: rgba(255,255,255,0.05); }
        .action-btn.delete:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }

        @media (max-width: 968px) {
          .list-header { display: none; }
          .song-row { grid-template-columns: 1fr auto; gap: 1rem; padding: 1.5rem; }
          .col-tonality, .col-genre { display: none; }
          .title-section h1 { font-size: 2.5rem; }
          .header-actions { gap: 0.9rem; margin-top: 1.8rem; }
          .search-box { min-width: 0; max-width: 100%; width: 100%; }
        }

        @media (max-width: 560px) {
          .repertoire-container { padding-top: 7.2rem; }
          .title-section h1 { font-size: 2rem; letter-spacing: -1px; margin-bottom: 0.9rem; }
          .header-actions :global(a),
          .header-actions :global(.btn) {
            width: 100%;
          }
          .search-box {
            padding: 0.65rem 1rem;
            border-radius: 14px;
            gap: 0.7rem;
          }
          .song-row {
            padding: 1.1rem 0.95rem;
            gap: 0.8rem;
          }
          .song-name { font-size: 1rem; }
        }
      `}</style>
    </div>
  );
}
