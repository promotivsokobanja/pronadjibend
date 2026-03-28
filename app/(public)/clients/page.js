'use client';
import { Music } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import BandCard from '../../../components/BandCard';
import StickySearch from '../../../components/StickySearch';
import BottomFilterSheet from '../../../components/BottomFilterSheet';

export default function ClientSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [activeFilters, setActiveFilters] = useState({
    genre: '',
    location: '',
    equipment: false,
  });
  const [bands, setBands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const bandsPerPage = 6;

  // Genre categories for the YouTube-style chips
  const categories = [
    'Svi žanrovi', 
    'Pop/Rock', 
    'Zabavna', 
    'Narodna', 
    'Jazz', 
    'Acoustic'
  ];

  const normalize = (v) => (v || '').toString().toLowerCase().trim();
  const isAllGenres = !activeFilters.genre;

  const handleCategorySelect = (cat) => {
    const nextGenre = cat === 'Svi žanrovi' ? '' : cat;
    setActiveFilters((prev) => ({ ...prev, genre: nextGenre }));
    setSortBy(nextGenre ? 'genre' : 'recommended');
    setCurrentPage(1);
  };

  const fetchBands = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        search: searchTerm,
        genre: activeFilters.genre,
        location: activeFilters.location
      }).toString();
      const resp = await fetch(`/api/bands?${query}`, { cache: 'no-store' });
      if (!resp.ok) throw new Error('Network response was not ok');
      const data = await resp.json();
      setBands(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Greška pri preuzimanju bendova:", err);
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
    <div className="search-page theme-light min-h-screen bg-white">
      {/* Sticky Search & Chips Unit */}
      <StickySearch 
        onSearch={setSearchTerm} 
        onFilterToggle={() => setIsFilterSheetOpen(true)} 
        categories={categories}
        activeCategory={activeFilters.genre || 'Svi žanrovi'}
        onCategorySelect={handleCategorySelect}
      />
      
      <main className="container py-8 md:py-12">
        {/* Results Header */}
        <div className="mb-8 flex flex-col gap-4 border-b border-slate-100 pb-5 md:mb-10 md:flex-row md:items-end md:justify-between md:pb-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
              Pronađi <span className="text-[#007AFF]">savršeni bend</span>
            </h2>
            <p className="text-slate-500">
              Kuriran izbor provereno kvalitetnih bendova za događaje svih tipova.
            </p>
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 self-start sm:w-auto sm:flex-row sm:items-center sm:gap-3 md:self-auto">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              {genreFilteredBands.length} rezultata
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 w-full rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-[#007AFF] sm:w-auto"
            >
              <option value="recommended">Preporučeno</option>
              <option value="genre">Aktivni žanr</option>
              <option value="rating">Najbolje ocenjeni</option>
              <option value="name">Naziv A-Z</option>
            </select>
          </div>
        </div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#007AFF]" />
          </div>
        ) : bands.length > 0 ? (
          <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {visibleBands.map((band) => (
              <BandCard key={band.id} band={band} />
            ))}
          </div>
          <div className="mt-10 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prethodna
            </button>
            <span className="text-sm font-semibold text-slate-500">
              Strana {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sledeća
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
              }}
            >
              Resetuj sve
            </button>
          </div>
        )}
      </main>

      {/* Mobile Filter Sheet */}
      <BottomFilterSheet 
        isOpen={isFilterSheetOpen} 
        onClose={() => setIsFilterSheetOpen(false)}
        title="Napredni Filteri"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Lokacija</label>
            <input 
              type="text" 
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/10" 
              placeholder="Grad ili region..."
              value={activeFilters.location}
              onChange={e => setActiveFilters(prev => ({...prev, location: e.target.value}))}
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Žanr</label>
            <div className="rounded-2xl border border-slate-200 bg-white p-2">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const active = (activeFilters.genre || 'Svi žanrovi') === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() =>
                        setActiveFilters((prev) => ({
                          ...prev,
                          genre: cat === 'Svi žanrovi' ? '' : cat,
                        }))
                      }
                      className={[
                        'rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
                        active
                          ? 'bg-slate-200 text-slate-900 shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                      ].join(' ')}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <input 
              type="checkbox" 
              id="ext-equipment" 
              checked={activeFilters.equipment}
              onChange={e => setActiveFilters(prev => ({...prev, equipment: e.target.checked}))}
              className="h-4 w-4 accent-[#007AFF]"
            />
            <label htmlFor="ext-equipment" className="font-semibold text-sm text-slate-700">Sopstveno ozvučenje i rasveta</label>
          </div>
        </div>
      </BottomFilterSheet>
    </div>
  );
}
