'use client';

import { useClientSearch, CLIENT_GENRE_CATEGORIES } from './ClientSearchContext';

export default function ClientFilterForm() {
  const { activeFilters, setActiveFilters, handleCategorySelect } = useClientSearch();

  return (
    <div className="space-y-2.5">
      <section className="space-y-1">
        <p className="m-0 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-slate-400">
          Žanr
        </p>
        <div
          className={[
            'grid grid-cols-2 gap-1.5 sm:gap-2 sm:grid-cols-3',
            'lg:flex lg:flex-nowrap lg:gap-2 lg:items-stretch',
          ].join(' ')}
        >
          {CLIENT_GENRE_CATEGORIES.map((cat) => {
            const active = (activeFilters.genre || 'Svi žanrovi') === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategorySelect(cat)}
                className={[
                  'inline-flex min-h-[40px] w-full items-center justify-center rounded-full border px-2 py-1.5 text-center text-[0.6875rem] font-semibold leading-tight transition-all duration-200 sm:min-h-[44px] sm:px-3 sm:py-2 sm:text-xs md:text-sm',
                  'lg:min-h-[42px] lg:flex-1 lg:basis-0 lg:min-w-0 lg:px-3 lg:py-2.5',
                  active
                    ? 'border-[#007AFF] bg-[#007AFF] text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50',
                ].join(' ')}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-2 sm:grid-cols-[1fr_minmax(0,auto)] sm:items-end sm:gap-3">
        <section className="min-w-0 space-y-1">
          <label
            htmlFor="cff-location"
            className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-slate-400"
          >
            Lokacija
          </label>
          <input
            id="cff-location"
            type="text"
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#007AFF] focus:bg-white focus:ring-2 focus:ring-[#007AFF]/12"
            placeholder="Grad ili region…"
            value={activeFilters.location}
            onChange={(e) =>
              setActiveFilters((prev) => ({ ...prev, location: e.target.value }))
            }
          />
        </section>

        <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 transition-colors hover:bg-white sm:h-9 sm:shrink-0 sm:py-0">
          <input
            type="checkbox"
            checked={activeFilters.equipment}
            onChange={(e) =>
              setActiveFilters((prev) => ({
                ...prev,
                equipment: e.target.checked,
              }))
            }
            className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-[#007AFF] accent-[#007AFF]"
          />
          <span className="text-[0.6875rem] font-medium leading-snug text-slate-600 sm:text-xs sm:leading-tight">
            Sopstveno ozvučenje i rasveta
          </span>
        </label>
      </div>
    </div>
  );
}
