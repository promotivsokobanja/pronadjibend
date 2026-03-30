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

export const CLIENT_EVENT_TYPES = [
  { value: '', label: 'Sve vrste događaja' },
  { value: 'svadba', label: 'Svadba' },
  { value: 'rodjendan', label: 'Rođendan' },
  { value: 'korporativno', label: 'Korporativni događaj' },
  { value: 'restoran', label: 'Restoran / Kafić' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'festival', label: 'Festival / Manifestacija' },
];

export const CLIENT_BUDGET_OPTIONS = [
  { value: '', label: 'Svi budžeti' },
  { value: 'do500', label: 'Do 500€' },
  { value: '500-1000', label: '500€ – 1000€' },
  { value: '1000-1500', label: '1000€ – 1500€' },
  { value: '1500plus', label: '1500€+' },
];

const defaultFilters = {
  genre: '',
  location: '',
  equipment: false,
  eventType: '',
  budget: '',
  eventDate: '',
};

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
      (activeFilters.equipment ? 1 : 0) +
      (activeFilters.eventType ? 1 : 0) +
      (activeFilters.budget ? 1 : 0) +
      (activeFilters.eventDate ? 1 : 0),
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
