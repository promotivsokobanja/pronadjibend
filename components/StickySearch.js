'use client';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function StickySearch({ 
  onSearch, 
  onFilterToggle, 
  categories = [], 
  activeCategory = 'Svi žanrovi', 
  onCategorySelect 
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 150);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  return (
    <div className={`sticky-search-wrapper ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <form className="search-flex" onSubmit={handleSubmit}>
          <div className="search-input-area">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder="Pretraži bendove, žanrove ili gradove..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                aria-label="Obriši"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="search-actions">
            <button
              type="button"
              className="filter-toggle-btn"
              onClick={onFilterToggle}
            >
              <SlidersHorizontal size={18} />
              <span>Filteri</span>
            </button>
            <button
              type="submit"
              className="btn btn-primary search-submit"
            >
              Pretraži
            </button>
          </div>
        </form>

        {categories.length > 0 && (
          <div className="chip-filter-scroll">
            <div className="chips-flex">
              {categories.map((cat) => {
                const active = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onCategorySelect(cat)}
                    className={[
                      'chip-pill',
                      active ? 'active' : '',
                    ].join(' ')}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .sticky-search-wrapper {
          position: sticky;
          top: 84px;
          z-index: 40;
          padding: 1.5rem 0 1rem;
          transition: var(--transition);
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .sticky-search-wrapper.scrolled {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(16px);
          padding: 0.75rem 0;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
        }

        .search-flex {
          display: flex;
          gap: 12px;
          align-items: center;
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
        }

        .search-input-area {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 1.25rem;
          height: 52px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 100px;
          transition: var(--transition);
        }

        .search-input-area:focus-within {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
        }

        .search-actions { display: flex; gap: 12px; }

        .filter-toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 20px;
          height: 52px;
          border-radius: 100px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #0f172a;
          font-weight: 700;
          cursor: pointer;
          transition: var(--transition);
        }

        .filter-toggle-btn:hover { border-color: #8b5cf6; color: #8b5cf6; }

        .search-submit {
          height: 52px;
          padding: 0 30px;
          border-radius: 100px;
          font-weight: 800;
        }

        .chip-filter-scroll {
          overflow-x: auto;
          scrollbar-width: none;
          width: 100%;
          max-width: 900px;
          margin: 1rem auto 0;
          padding: 0 4px;
        }

        .chip-filter-scroll::-webkit-scrollbar { display: none; }

        .chips-flex {
          display: flex;
          gap: 10px;
          padding: 2px 4px;
          min-width: max-content;
        }

        .chip-pill {
          flex: 0 0 auto;
          padding: 9px 18px;
          border-radius: 100px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #64748b;
          font-weight: 800;
          font-size: 0.85rem;
          cursor: pointer;
          transition: var(--transition);
          white-space: nowrap;
        }

        .chip-pill:hover { border-color: #8b5cf6; color: #8b5cf6; }
        .chip-pill.active { background: #0f172a; color: #ffffff; border-color: #0f172a; }

        @media (max-width: 768px) {
          .sticky-search-wrapper { top: 78px; }
          .search-flex { flex-direction: column; align-items: stretch; }
          .search-actions { display: grid; grid-template-columns: 1fr 1fr; }
          .filter-toggle-btn, .search-submit { width: 100%; }
        }
      `}</style>
    </div>
  );
}
