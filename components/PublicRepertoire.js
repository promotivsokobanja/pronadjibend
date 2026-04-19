'use client';
import { useMemo, useState } from 'react';
import { Music, Search } from 'lucide-react';

/**
 * Public repertoire viewer for band/musician profile pages.
 * Props: songs: [{ id, title, artist, category, type }]
 */
export default function PublicRepertoire({ songs = [] }) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Sve');

  const categories = useMemo(() => {
    const set = new Set();
    songs.forEach((s) => {
      const cat = s.category || s.type;
      if (cat) set.add(cat);
    });
    return ['Sve', ...Array.from(set).sort()];
  }, [songs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return songs.filter((s) => {
      const cat = s.category || s.type || '';
      const matchCat = activeCategory === 'Sve' || cat === activeCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        String(s.title || '').toLowerCase().includes(q) ||
        String(s.artist || '').toLowerCase().includes(q)
      );
    });
  }, [songs, query, activeCategory]);

  if (!songs || songs.length === 0) return null;

  return (
    <section className="public-repertoire">
      <div className="pr-header">
        <h2>
          <Music size={20} /> Repertoar
          <span className="pr-count">{songs.length}</span>
        </h2>
        <div className="pr-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Pretraži pesme..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {categories.length > 1 && (
        <div className="pr-categories" role="tablist">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`pr-cat ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="pr-empty">Nema pesama koje odgovaraju pretrazi.</div>
      ) : (
        <ul className="pr-list">
          {filtered.map((s) => (
            <li key={s.id} className="pr-item">
              <div className="pr-title">{s.title}</div>
              {s.artist && <div className="pr-artist">{s.artist}</div>}
              {(s.category || s.type) && (
                <div className="pr-cat-tag">{s.category || s.type}</div>
              )}
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .public-repertoire {
          background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 14px;
          padding: 1.25rem;
          margin: 1.5rem 0;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
        }
        .pr-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .pr-header h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          font-size: 1.25rem;
          color: #fff;
        }
        .pr-count {
          background: rgba(139, 92, 246, 0.25);
          color: #c4b5fd;
          font-size: 0.85rem;
          padding: 0.15rem 0.6rem;
          border-radius: 999px;
          font-weight: 600;
        }
        .pr-search {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 0.5rem 0.75rem;
          flex: 1;
          max-width: 280px;
          min-width: 180px;
          color: rgba(255, 255, 255, 0.6);
        }
        .pr-search input {
          background: transparent;
          border: none;
          color: #fff;
          outline: none;
          flex: 1;
          font-size: 0.95rem;
        }
        .pr-search input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        .pr-categories {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-bottom: 1rem;
        }
        .pr-cat {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          padding: 0.35rem 0.85rem;
          border-radius: 999px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s ease;
        }
        .pr-cat:hover {
          background: rgba(139, 92, 246, 0.15);
          color: #fff;
        }
        .pr-cat.active {
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          color: #fff;
          border-color: transparent;
        }
        .pr-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 0.5rem;
          max-height: 420px;
          overflow-y: auto;
        }
        .pr-item {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 0.65rem 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .pr-title {
          color: #fff;
          font-weight: 600;
          font-size: 0.95rem;
          word-break: break-word;
        }
        .pr-artist {
          color: #a78bfa;
          font-size: 0.85rem;
        }
        .pr-cat-tag {
          color: #94a3b8;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-top: 0.15rem;
        }
        .pr-empty {
          color: #94a3b8;
          text-align: center;
          padding: 1.5rem;
          font-size: 0.9rem;
        }

        @media (max-width: 640px) {
          .public-repertoire {
            padding: 1rem;
          }
          .pr-header {
            flex-direction: column;
            align-items: stretch;
          }
          .pr-search {
            max-width: 100%;
          }
          .pr-list {
            grid-template-columns: 1fr;
            max-height: 360px;
          }
          .pr-header h2 {
            font-size: 1.1rem;
          }
        }

        /* Dark scrollbar */
        .pr-list::-webkit-scrollbar {
          width: 8px;
        }
        .pr-list::-webkit-scrollbar-track {
          background: #0f0f0f;
        }
        .pr-list::-webkit-scrollbar-thumb {
          background: #4a4a4a;
          border-radius: 4px;
        }
      `}</style>
    </section>
  );
}
