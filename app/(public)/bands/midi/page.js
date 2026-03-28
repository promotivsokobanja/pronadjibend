'use client';
import { Search, Music, Download, Lock, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['Sve', 'Zabavna', 'Narodna', 'Kola', 'Mixevi', 'Decije'];
const ALPHABET = 'ABCČĆDĐEFGHIJKLMNOPRSTUVZŽ'.split('');

export default function MidiLibraryPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('Sve');
  const [activeLetter, setActiveLetter] = useState('');
  const [files, setFiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [counts, setCounts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!r.ok) { router.replace('/login'); return; }
        const { user } = await r.json();
        setIsLoggedIn(true);
        setIsPremium(user?.plan === 'PREMIUM');
      } catch { /* ignore */ }
    })();
  }, [router]);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams({ search: searchTerm, category, letter: activeLetter, page: String(page) });
      const resp = await fetch(`/api/midi?${qs}`, { cache: 'no-store' });
      const data = await resp.json();
      setFiles(data.files || []);
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
    const t = setTimeout(() => { setPage(1); fetchFiles(); }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, category, activeLetter]);

  useEffect(() => { fetchFiles(); }, [page]);

  const handleDownload = async (file) => {
    if (!isPremium) return;
    setDownloading(file.id);
    try {
      const resp = await fetch(`/api/midi/download?id=${file.id}`);
      const data = await resp.json();
      if (data.url) {
        const a = document.createElement('a');
        a.href = data.url;
        a.download = data.fileName || file.fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert(data.error || 'Greška pri preuzimanju.');
      }
    } catch {
      alert('Greška pri preuzimanju.');
    } finally {
      setDownloading(null);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="midi-container container">
      <div className="blob" style={{ top: '10%', right: '-10%' }}></div>

      <header className="page-header">
        <Link href="/bands" className="back-link"><Music size={14} /> Dashboard</Link>
        <div className="title-row">
          <h1>MIDI Biblioteka</h1>
          <span className="total-badge">{(counts['Sve'] || 0).toLocaleString()} fajlova</span>
          {isPremium ? (
            <span className="premium-badge">PREMIUM</span>
          ) : (
            <span className="locked-badge"><Lock size={12} /> Potreban PREMIUM</span>
          )}
        </div>
        {!isPremium && (
          <div className="premium-banner">
            <Lock size={18} />
            <div>
              <strong>MIDI fajlovi su dostupni samo PREMIUM članovima.</strong>
              <p>Nadogradite na PREMIUM plan da biste preuzimali MIDI fajlove za vaše nastupe.</p>
            </div>
            <Link href="/premium/checkout" className="upgrade-btn">Nadogradi</Link>
          </div>
        )}

        <div className="cat-tabs">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`cat-tab ${category === cat ? 'active' : ''}`}
              onClick={() => { setCategory(cat); setActiveLetter(''); setPage(1); }}
            >
              {cat}
              {counts[cat] != null && <span className="cat-count">{counts[cat].toLocaleString()}</span>}
            </button>
          ))}
        </div>

        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Pretraži po nazivu ili izvođaču..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setActiveLetter(''); }}
          />
          {searchTerm && <button className="clear-btn" onClick={() => setSearchTerm('')}><X size={16} /></button>}
        </div>

        <div className="alpha-bar">
          {ALPHABET.map(l => (
            <button
              key={l}
              className={`alpha-btn ${activeLetter === l ? 'active' : ''}`}
              onClick={() => { setActiveLetter(activeLetter === l ? '' : l); setSearchTerm(''); setPage(1); }}
            >
              {l}
            </button>
          ))}
        </div>
      </header>

      <main className="file-list">
        {isLoading ? (
          <div className="empty-state"><div className="loader"></div><p>Učitavanje...</p></div>
        ) : files.length === 0 ? (
          <div className="empty-state">
            <Music size={48} className="text-muted" />
            <p>{searchTerm || activeLetter ? 'Nema rezultata.' : 'Izaberite kategoriju ili pretražite.'}</p>
          </div>
        ) : (
          <>
            <div className="results-info">
              {total.toLocaleString()} rezultata
              {activeLetter && <> na slovo <strong>{activeLetter}</strong></>}
              {searchTerm && <> za <strong>&ldquo;{searchTerm}&rdquo;</strong></>}
            </div>

            <div className="list-header">
              <span className="col-name">NAZIV</span>
              <span className="col-artist">IZVOĐAČ</span>
              <span className="col-cat">KATEGORIJA</span>
              <span className="col-size">VELIČINA</span>
              <span className="col-dl">DOWNLOAD</span>
            </div>

            {files.map((file) => (
              <div key={file.id} className="file-row">
                <div className="col-name">
                  <span className="midi-icon">♪</span>
                  <span className="file-title">{file.title}</span>
                </div>
                <div className="col-artist">{file.artist}</div>
                <div className="col-cat">
                  <span className={`cat-badge ${file.category.toLowerCase()}`}>{file.category}</span>
                </div>
                <div className="col-size">{formatSize(file.fileSize)}</div>
                <div className="col-dl">
                  {isPremium ? (
                    <button
                      className="dl-btn"
                      onClick={() => handleDownload(file)}
                      disabled={downloading === file.id}
                    >
                      <Download size={14} />
                      {downloading === file.id ? '...' : '.mid'}
                    </button>
                  ) : (
                    <span className="lock-icon"><Lock size={14} /></span>
                  )}
                </div>
              </div>
            ))}

            {pages > 1 && (
              <div className="pagination">
                <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={16} /> Preth.
                </button>
                <span className="page-info">{page} / {pages}</span>
                <button className="page-btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
                  Sled. <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <style jsx>{`
        .midi-container { padding-top: 8rem; padding-bottom: 6rem; min-height: 100vh; }
        .page-header { margin-bottom: 2rem; }
        .back-link { display: flex; align-items: center; gap: 0.5rem; color: #555; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1.5rem; transition: 0.3s; }
        .back-link:hover { color: white; }

        .title-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .title-row h1 { font-size: 2.8rem; font-weight: 800; letter-spacing: -2px; }
        .total-badge { background: rgba(59,130,246,0.1); color: #60a5fa; padding: 4px 14px; border-radius: 100px; font-size: 0.8rem; font-weight: 800; }
        .premium-badge { background: linear-gradient(135deg, #f59e0b, #f97316); color: black; padding: 4px 14px; border-radius: 100px; font-size: 0.75rem; font-weight: 900; letter-spacing: 1px; }
        .locked-badge { display: flex; align-items: center; gap: 4px; background: rgba(239,68,68,0.1); color: #f87171; padding: 4px 14px; border-radius: 100px; font-size: 0.75rem; font-weight: 800; }

        .premium-banner {
          display: flex; align-items: center; gap: 1.25rem; padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, rgba(245,158,11,0.08), rgba(249,115,22,0.08));
          border: 1px solid rgba(245,158,11,0.25); border-radius: var(--radius-md);
          margin-bottom: 1.5rem; color: #fbbf24;
        }
        .premium-banner p { font-size: 0.8rem; color: #a78bfa; margin-top: 2px; }
        .upgrade-btn {
          padding: 8px 20px; border-radius: 100px; font-size: 0.8rem; font-weight: 800;
          background: linear-gradient(135deg, #f59e0b, #f97316); color: black; text-decoration: none;
          white-space: nowrap; transition: 0.3s;
        }
        .upgrade-btn:hover { transform: scale(1.05); }

        .cat-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .cat-tab {
          padding: 8px 18px; border-radius: 100px; font-size: 0.8rem; font-weight: 700;
          border: 1px solid var(--border); background: rgba(255,255,255,0.02);
          color: #888; cursor: pointer; transition: all 0.25s; display: flex; align-items: center; gap: 8px;
        }
        .cat-tab:hover { border-color: #555; color: #ccc; }
        .cat-tab.active { background: #60a5fa; color: black; border-color: #60a5fa; }
        .cat-tab.active .cat-count { background: rgba(0,0,0,0.2); color: black; }
        .cat-count { font-size: 0.65rem; background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 100px; color: #666; }

        .search-box {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.7rem 1.25rem; background: rgba(255,255,255,0.03);
          border: 1px solid var(--border); border-radius: 100px;
          margin-bottom: 1rem; transition: border-color 0.3s;
        }
        .search-box:focus-within { border-color: #60a5fa; }
        .search-icon { color: #555; flex-shrink: 0; }
        .search-box input { background: none; border: none; color: #1a1a1a; width: 100%; outline: none; font-size: 0.95rem; }
        .clear-btn { background: none; border: none; color: #555; cursor: pointer; display: flex; padding: 4px; border-radius: 50%; }
        .clear-btn:hover { color: #ef4444; }

        .alpha-bar { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 0.5rem; }
        .alpha-btn {
          width: 34px; height: 34px; border-radius: 8px; font-size: 0.75rem; font-weight: 800;
          border: 1px solid var(--border); background: rgba(255,255,255,0.02);
          color: #666; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
        }
        .alpha-btn:hover { border-color: #555; color: #ccc; }
        .alpha-btn.active { background: #60a5fa; color: black; border-color: #60a5fa; }

        .results-info { font-size: 0.8rem; color: #666; margin-bottom: 0.75rem; padding-left: 4px; }
        .results-info strong { color: #aaa; }

        .list-header {
          display: grid; grid-template-columns: 2fr 1.5fr 0.8fr 0.6fr 0.7fr;
          padding: 0.75rem 1.25rem; font-size: 0.65rem; font-weight: 800; color: #555;
          letter-spacing: 1.5px; border-bottom: 1px solid var(--border);
          background: rgba(255,255,255,0.02);
        }

        .file-row {
          display: grid; grid-template-columns: 2fr 1.5fr 0.8fr 0.6fr 0.7fr;
          padding: 0.75rem 1.25rem; align-items: center;
          border-bottom: 1px solid var(--border); transition: background 0.15s;
        }
        .file-row:hover { background: rgba(255,255,255,0.02); }

        .midi-icon { color: #60a5fa; margin-right: 8px; font-size: 1rem; }
        .file-title { font-weight: 600; font-size: 0.95rem; }
        .col-artist { color: #888; font-size: 0.85rem; }
        .col-size { color: #666; font-size: 0.8rem; }

        .cat-badge {
          font-size: 0.6rem; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;
          padding: 3px 10px; border-radius: 100px;
        }
        .cat-badge.zabavna { background: rgba(59,130,246,0.1); color: #60a5fa; }
        .cat-badge.narodna { background: rgba(234,179,8,0.1); color: #facc15; }
        .cat-badge.kola { background: rgba(16,185,129,0.1); color: #34d399; }
        .cat-badge.mixevi { background: rgba(168,85,247,0.1); color: #c084fc; }
        .cat-badge.decije { background: rgba(236,72,153,0.1); color: #f472b6; }

        .dl-btn {
          display: flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 100px;
          background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.25);
          color: #60a5fa; font-size: 0.72rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
        }
        .dl-btn:hover:not(:disabled) { background: #60a5fa; color: black; border-color: #60a5fa; }
        .dl-btn:disabled { opacity: 0.5; cursor: wait; }

        .lock-icon { color: #444; display: flex; align-items: center; }

        .pagination { display: flex; justify-content: center; align-items: center; gap: 1.5rem; margin-top: 2rem; padding: 1rem 0; }
        .page-btn {
          display: flex; align-items: center; gap: 4px;
          padding: 8px 20px; border-radius: 100px;
          background: rgba(255,255,255,0.03); border: 1px solid var(--border);
          color: #aaa; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: 0.3s;
        }
        .page-btn:hover:not(:disabled) { border-color: #60a5fa; color: #60a5fa; }
        .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .page-info { font-size: 0.8rem; color: #555; font-weight: 700; }

        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 5rem 2rem; color: #444; }

        @media (max-width: 768px) {
          .title-row h1 { font-size: 2rem; }
          .alpha-btn { width: 28px; height: 28px; font-size: 0.65rem; }
          .list-header { display: none; }
          .file-row { grid-template-columns: 1fr auto; gap: 0.5rem; }
          .col-artist, .col-cat, .col-size { display: none; }
          .premium-banner { flex-direction: column; text-align: center; }
        }
      `}</style>
    </div>
  );
}
