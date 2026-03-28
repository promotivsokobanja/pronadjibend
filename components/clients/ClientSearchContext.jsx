'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export const CLIENT_GENRE_CATEGORIES = [
  'Svi žanrovi',
  'Pop/Rock',
  'Zabavna',
  'Narodna',
  'Jazz',
  'Acoustic',
];

const defaultFilters = { genre: '', location: '', equipment: false };

const ClientSearchContext = createContext(null);

export function ClientSearchProvider({ children }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isNavSearchOpen, setIsNavSearchOpen] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [activeFilters, setActiveFilters] = useState(defaultFilters);

  const handleCategorySelect = useCallback((cat) => {
    const nextGenre = cat === 'Svi žanrovi' ? '' : cat;
    setActiveFilters((prev) => ({ ...prev, genre: nextGenre }));
    setSortBy(nextGenre ? 'genre' : 'recommended');
  }, []);

  const activeFilterCount = useMemo(
    () =>
      (activeFilters.genre ? 1 : 0) +
      (activeFilters.location?.trim() ? 1 : 0) +
      (activeFilters.equipment ? 1 : 0),
    [activeFilters],
  );

  const value = useMemo(
    () => ({
      searchTerm,
      setSearchTerm,
      activeFilters,
      setActiveFilters,
      isNavSearchOpen,
      setIsNavSearchOpen,
      sortBy,
      setSortBy,
      handleCategorySelect,
      activeFilterCount,
    }),
    [
      searchTerm,
      activeFilters,
      isNavSearchOpen,
      sortBy,
      handleCategorySelect,
      activeFilterCount,
    ],
  );

  return (
    <ClientSearchContext.Provider value={value}>
      {children}
    </ClientSearchContext.Provider>
  );
}

export function useClientSearch() {
  const ctx = useContext(ClientSearchContext);
  if (!ctx) {
    throw new Error('useClientSearch must be used within ClientSearchProvider');
  }
  return ctx;
}
