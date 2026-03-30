'use client';

import { Music } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import BandCard from '../../../components/BandCard';
import BandCardSkeleton from '../../../components/BandCardSkeleton';
import { useClientSearch } from '../../../components/clients/ClientSearchContext';

export default function ClientSearchClient() {
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
  const bandsPerPage = 6;

  const normalize = (v) => (v || '').toString().toLowerCase().trim();
  const isAllGenres = !activeFilters.genre;

  const fetchBands = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        search: searchTerm,
        genre: activeFilters.genre,
        location: activeFilters.location,
      }).toString();
      const resp = await fetch(`/api/bands?${query}`, { cache: 'no-store' });
      if (!resp.ok) throw new Error('Network response was not ok');
      const data = await resp.json();
      setBands(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Greška pri preuzimanju bendova:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, activeFilters]);

  useEffect(() => {
    const timer = setTimeout(() => fetchBands(), 300);
    return () => clearTimeout(timer);
  }, [fetchBands]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilters.genre, activeFilters.location, activeFilters.equipment]);

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

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="search-page theme-light page-below-fixed-nav min-h-screen bg-white">
      <main className="container pb-10 pt-6 md:pb-14 md:pt-10">
        <div className="mb-8 flex flex-col gap-6 border-b border-slate-200/70 pb-8 md:mb-10 md:flex-row md:items-center md:justify-between md:gap-8 md:pb-8">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 md:gap-7">
            <h1 className="text-[1.65rem] font-black leading-[1.15] tracking-[-0.03em] text-slate-900 sm:text-3xl md:text-4xl">
              Pronađi <span className="text-[#007AFF]">savršeni bend</span>
            </h1>
            <button
              type="button"
              onClick={() => setIsNavSearchOpen(true)}
              className="inline-flex max-w-full min-h-11 min-w-[13.5rem] shrink-0 items-center justify-center rounded-full border border-slate-400 bg-[#007AFF] px-5 py-2.5 text-center text-xs font-semibold leading-snug text-white shadow-md shadow-[#007AFF]/25 transition hover:border-slate-500 hover:bg-[#0066d6] hover:shadow-lg hover:shadow-[#007AFF]/30 sm:ml-2 sm:h-10 sm:min-h-0 sm:min-w-[15rem] sm:px-5 sm:text-sm sm:leading-tight sm:py-0"
            >
              Pretraga
            </button>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
            <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold tabular-nums text-slate-600">
              {genreFilteredBands.length} rezultata
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="min-h-11 w-full min-w-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12 sm:h-10 sm:min-h-0 sm:min-w-[11rem] sm:w-auto sm:py-0"
            >
              <option value="recommended">Preporučeno</option>
              <option value="genre">Aktivni žanr</option>
              <option value="rating">Najbolje ocenjeni</option>
              <option value="name">Naziv A-Z</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-4 grid grid-cols-1 gap-7 sm:mt-5 sm:grid-cols-2 sm:gap-8 lg:mt-6 lg:grid-cols-3 lg:gap-9">
            {Array.from({ length: 6 }).map((_, i) => (
              <BandCardSkeleton key={i} />
            ))}
          </div>
        ) : bands.length > 0 ? (
          <>
            <div className="mt-4 grid grid-cols-1 gap-7 sm:mt-5 sm:grid-cols-2 sm:gap-8 lg:mt-6 lg:grid-cols-3 lg:gap-9">
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
            <div className="mt-10 flex flex-col items-stretch gap-4 px-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="min-h-12 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-11 sm:px-5 sm:py-2.5"
              >
                Prethodna strana
              </button>
              <span className="order-first text-center text-sm font-semibold text-slate-500 sm:order-none">
                Strana {currentPage} od {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="min-h-12 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-11 sm:px-5 sm:py-2.5"
              >
                Sledeća strana
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-200 bg-[#F7F7F7] px-6 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white">
              <Music size={28} className="text-slate-300" />
            </div>
            <h3 className="mt-4 text-xl font-bold">Nema rezultata</h3>
            <p className="mt-2 text-slate-500">Pokušaj sa drugom pretragom ili očisti filtere.</p>
            <button
              className="btn btn-secondary mt-6"
              onClick={() => {
                setSearchTerm('');
                setActiveFilters({ genre: '', location: '', equipment: false });
                setSortBy('recommended');
              }}
            >
              Resetuj sve
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
