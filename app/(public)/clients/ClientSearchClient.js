'use client';

import { Music } from 'lucide-react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import BandCard from '../../../components/BandCard';
import BandCardSkeleton from '../../../components/BandCardSkeleton';
import { useClientSearch } from '../../../components/clients/ClientSearchContext';

export default function ClientSearchClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    searchTerm,
    setSearchTerm,
    activeFilters,
    setActiveFilters,
    sortBy,
    setSortBy,
    setIsNavSearchOpen,
  } = useClientSearch();

  const [bands, setBands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isHydratedFromUrl, setIsHydratedFromUrl] = useState(false);
  const bandsPerPage = 6;
  const lastSyncedQueryRef = useRef('');

  const normalize = (v) => (v || '').toString().toLowerCase().trim();
  const isAllGenres = !activeFilters.genre;

  const fetchBands = useCallback(async () => {
    if (!isHydratedFromUrl) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm?.trim()) params.set('search', searchTerm.trim());
      if (activeFilters.genre) params.set('genre', activeFilters.genre);
      if (activeFilters.location?.trim()) params.set('location', activeFilters.location.trim());
      if (activeFilters.equipment) params.set('equipment', '1');
      if (activeFilters.eventType) params.set('eventType', activeFilters.eventType);
      if (activeFilters.budget) params.set('budget', activeFilters.budget);
      if (activeFilters.eventDate) params.set('eventDate', activeFilters.eventDate);

      const query = params.toString();
      const resp = await fetch(`/api/bands?${query}`, { cache: 'no-store' });
      if (!resp.ok) throw new Error('Network response was not ok');
      const data = await resp.json();
      setBands(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Greška pri preuzimanju bendova:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, activeFilters, isHydratedFromUrl]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() || '');

    const nextSearch = params.get('search') || '';
    const nextGenre = params.get('genre') || '';
    const nextLocation = params.get('location') || '';
    const nextEquipment = params.get('equipment') === '1' || params.get('equipment') === 'true';
    const nextEventType = params.get('eventType') || '';
    const nextBudget = params.get('budget') || '';
    const nextEventDate = params.get('eventDate') || '';
    const nextSort = params.get('sort') || 'recommended';

    setSearchTerm(nextSearch);
    setActiveFilters((prev) => ({
      ...prev,
      genre: nextGenre,
      location: nextLocation,
      equipment: nextEquipment,
      eventType: nextEventType,
      budget: nextBudget,
      eventDate: nextEventDate,
    }));

    if (['recommended', 'genre', 'rating', 'name'].includes(nextSort)) {
      setSortBy(nextSort);
    }

    lastSyncedQueryRef.current = params.toString();
    setIsHydratedFromUrl(true);
  }, [searchParams, setActiveFilters, setSearchTerm, setSortBy]);

  useEffect(() => {
    if (!isHydratedFromUrl) return;

    const params = new URLSearchParams();
    if (searchTerm?.trim()) params.set('search', searchTerm.trim());
    if (activeFilters.genre) params.set('genre', activeFilters.genre);
    if (activeFilters.location?.trim()) params.set('location', activeFilters.location.trim());
    if (activeFilters.equipment) params.set('equipment', '1');
    if (activeFilters.eventType) params.set('eventType', activeFilters.eventType);
    if (activeFilters.budget) params.set('budget', activeFilters.budget);
    if (activeFilters.eventDate) params.set('eventDate', activeFilters.eventDate);
    if (sortBy !== 'recommended') params.set('sort', sortBy);

    const nextQuery = params.toString();
    if (lastSyncedQueryRef.current === nextQuery) return;
    lastSyncedQueryRef.current = nextQuery;

    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [searchTerm, activeFilters, sortBy, pathname, router, isHydratedFromUrl]);

  useEffect(() => {
    const timer = setTimeout(() => fetchBands(), 300);
    return () => clearTimeout(timer);
  }, [fetchBands]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilters.genre, activeFilters.location, activeFilters.equipment, activeFilters.eventType, activeFilters.budget, activeFilters.eventDate]);

  const genreFilteredBands = isAllGenres
    ? bands
    : bands.filter((b) => {
        const g = normalize(b.genre);
        const selected = normalize(activeFilters.genre);
        return g.includes(selected);
      });

  const totalPages = Math.max(1, Math.ceil(genreFilteredBands.length / bandsPerPage));
  const sortedBands = [...genreFilteredBands].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'genre' && !isAllGenres) {
      const selected = normalize(activeFilters.genre);
      const aMatch = normalize(a.genre).includes(selected) ? 1 : 0;
      const bMatch = normalize(b.genre).includes(selected) ? 1 : 0;
      return bMatch - aMatch;
    }
    return 0;
  });
  const startIndex = (currentPage - 1) * bandsPerPage;
  const visibleBands = sortedBands.slice(startIndex, startIndex + bandsPerPage);

  const sortedLabel = useMemo(() => {
    if (sortBy === 'rating') return 'Najbolje ocenjeni';
    if (sortBy === 'genre') return 'Aktivni žanr';
    if (sortBy === 'name') return 'Naziv A-Z';
    return 'Preporučeni';
  }, [sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="band-search-page page-below-fixed-nav">
      <main className="container band-search-main">
        <section className="search-hero-card">
          <div className="hero-header-row">
            <div>
              <h1 className="search-title">
                Pronađi <span className="text-[#007AFF]">savršeni bend</span>
              </h1>
              <p className="search-subtitle">
                Pogledaj proverene bendove po žanru, lokaciji i dostupnosti termina za tvoj događaj.
              </p>
            </div>
            <span className="results-pill">
              {genreFilteredBands.length} rezultata · {sortedLabel}
            </span>
          </div>

          <div className="hero-actions-row">
            <button
              type="button"
              onClick={() => setIsNavSearchOpen(true)}
              className="open-search-btn"
            >
              Otvori pretragu
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="recommended">Preporučeno</option>
              <option value="genre">Aktivni žanr</option>
              <option value="rating">Najbolje ocenjeni</option>
              <option value="name">Naziv A-Z</option>
            </select>
          </div>
        </section>

        {isLoading ? (
          <div className="results-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <BandCardSkeleton key={i} />
            ))}
          </div>
        ) : bands.length > 0 ? (
          <>
            <div className="results-grid">
              {visibleBands.map((band, i) => (
                <motion.div
                  key={`${currentPage}-${band.id}`}
                  initial={{ opacity: 1, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-32px' }}
                  transition={{
                    duration: 0.4,
                    delay: Math.min(i * 0.05, 0.2),
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <BandCard band={band} priority={currentPage === 1 && i === 0} />
                </motion.div>
              ))}
            </div>
            <div className="pagination-row">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="page-btn"
              >
                Prethodna strana
              </button>
              <span className="page-indicator">
                Strana {currentPage} od {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="page-btn"
              >
                Sledeća strana
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white">
              <Music size={28} className="text-slate-300" />
            </div>
            <h3 className="mt-4 text-xl font-bold">Nema rezultata</h3>
            <p className="mt-2 text-slate-500">Pokušaj sa drugom pretragom ili očisti filtere.</p>
            <button
              className="btn btn-secondary mt-6"
              onClick={() => {
                setSearchTerm('');
                setActiveFilters({
                  genre: '',
                  location: '',
                  equipment: false,
                  eventType: '',
                  budget: '',
                  eventDate: '',
                });
                setSortBy('recommended');
              }}
            >
              Resetuj sve
            </button>
          </div>
        )}
      </main>

      <style jsx>{`
        .band-search-page {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(77, 93, 232, 0.18), transparent 55%),
            #030308;
          padding-bottom: 4rem;
        }
        .band-search-main {
          padding-top: 8rem;
          padding-bottom: 1rem;
        }
        .search-hero-card {
          margin-bottom: 1.1rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(10, 10, 22, 0.85);
          border-radius: 26px;
          padding: 1.5rem;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }
        .hero-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.9rem;
        }
        .search-title {
          margin: 0;
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          font-weight: 900;
          line-height: 1.1;
          letter-spacing: -0.03em;
          color: #f8fafc;
        }
        .search-subtitle {
          margin: 0.45rem 0 0;
          color: rgba(226, 232, 240, 0.7);
          font-size: 0.92rem;
          line-height: 1.55;
          max-width: 56ch;
        }
        .results-pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: #f8fafc;
          padding: 0.35rem 0.7rem;
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .hero-actions-row {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          flex-wrap: wrap;
        }
        .open-search-btn {
          min-height: 44px;
          border-radius: 999px;
          border: 1px solid #8b5cf6;
          background: #8b5cf6;
          color: #fff;
          font-size: 0.84rem;
          font-weight: 800;
          padding: 0 1rem;
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .open-search-btn:hover {
          background: #7c3aed;
          border-color: #7c3aed;
        }
        .sort-select {
          min-height: 44px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: #f8fafc;
          font-size: 0.84rem;
          font-weight: 700;
          padding: 0 0.9rem;
          min-width: 188px;
          outline: none;
        }
        .sort-select:focus {
          border-color: rgba(139, 92, 246, 0.6);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
        }
        .sort-select option {
          color: #050505;
          background: #f3f4f6;
        }
        .results-grid {
          margin-top: 0.8rem;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }
        .pagination-row {
          margin-top: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.65rem;
          flex-wrap: wrap;
        }
        .page-btn {
          min-height: 42px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: #f8fafc;
          font-size: 0.84rem;
          font-weight: 800;
          padding: 0 0.95rem;
        }
        .page-btn:disabled {
          opacity: 0.42;
          cursor: not-allowed;
        }
        .page-indicator {
          font-size: 0.82rem;
          font-weight: 700;
          color: rgba(226, 232, 240, 0.7);
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 24px;
          border: 1px dashed rgba(255, 255, 255, 0.2);
          background: rgba(8, 8, 18, 0.8);
          color: #f8fafc;
          padding: 4.2rem 1.25rem;
          text-align: center;
          margin-top: 0.8rem;
        }

        @media (max-width: 1260px) {
          .results-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 740px) {
          .band-search-main {
            padding-top: 7.2rem;
          }
          .search-hero-card {
            border-radius: 16px;
            padding: 0.9rem;
          }
          .hero-header-row {
            flex-direction: column;
          }
          .results-grid {
            grid-template-columns: 1fr;
          }
          .search-title {
            font-size: 1.65rem;
          }
          .sort-select,
          .open-search-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
