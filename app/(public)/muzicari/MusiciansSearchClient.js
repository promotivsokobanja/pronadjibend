'use client';

import Link from 'next/link';
import { Music2, MapPin, SlidersHorizontal } from 'lucide-react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import SocialShareActions from '../../../components/SocialShareActions';

export default function MusiciansSearchClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');
  const [instrument, setInstrument] = useState('');
  const [city, setCity] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [sort, setSort] = useState('recommended');

  const [musicians, setMusicians] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydratedFromUrl, setIsHydratedFromUrl] = useState(false);
  const lastSyncedQueryRef = useRef('');

  const fetchMusicians = useCallback(async () => {
    if (!isHydratedFromUrl) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (instrument.trim()) params.set('instrument', instrument.trim());
      if (city.trim()) params.set('city', city.trim());
      if (maxBudget.trim()) params.set('maxBudget', maxBudget.trim());
      if (eventDate.trim()) params.set('eventDate', eventDate.trim());
      if (sort !== 'recommended') params.set('sort', sort);

      const res = await fetch(`/api/musicians?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      setMusicians(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Greška pri preuzimanju muzičara:', error);
      setMusicians([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, instrument, city, maxBudget, eventDate, sort, isHydratedFromUrl]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() || '');

    setSearch(params.get('search') || '');
    setInstrument(params.get('instrument') || '');
    setCity(params.get('city') || '');
    setMaxBudget(params.get('maxBudget') || '');
    setEventDate(params.get('eventDate') || '');

    const sortParam = params.get('sort') || 'recommended';
    if (['recommended', 'rating', 'priceAsc', 'name'].includes(sortParam)) {
      setSort(sortParam);
    }

    lastSyncedQueryRef.current = params.toString();
    setIsHydratedFromUrl(true);
  }, [searchParams]);

  useEffect(() => {
    if (!isHydratedFromUrl) return;

    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (instrument.trim()) params.set('instrument', instrument.trim());
    if (city.trim()) params.set('city', city.trim());
    if (maxBudget.trim()) params.set('maxBudget', maxBudget.trim());
    if (eventDate.trim()) params.set('eventDate', eventDate.trim());
    if (sort !== 'recommended') params.set('sort', sort);

    const nextQuery = params.toString();
    if (lastSyncedQueryRef.current === nextQuery) return;
    lastSyncedQueryRef.current = nextQuery;

    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [search, instrument, city, maxBudget, eventDate, sort, isHydratedFromUrl, pathname, router]);

  useEffect(() => {
    const timer = setTimeout(() => fetchMusicians(), 260);
    return () => clearTimeout(timer);
  }, [fetchMusicians]);

  const sortedLabel = useMemo(() => {
    if (sort === 'rating') return 'Najbolje ocenjeni';
    if (sort === 'priceAsc') return 'Najpovoljniji';
    if (sort === 'name') return 'Naziv A-Z';
    return 'Preporučeni';
  }, [sort]);

  return (
    <div className="musician-search-page page-below-fixed-nav">
      <main className="container musician-search-main">
        <div className="search-hero-card">
          <div className="flex items-start justify-between gap-4 max-md:flex-col">
            <div>
              <h1 className="search-title">
                Pronađi <span className="text-[#007AFF]">muzičara</span> za bend
              </h1>
              <p className="search-subtitle">
                Bubnjar, vokal, gitarista, klavijaturista i drugi profili sa dostupnošću i cenom.
              </p>
            </div>
            <span className="results-pill">
              {musicians.length} rezultata · {sortedLabel}
            </span>
          </div>

          <div className="filters-grid">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ime / ključna reč"
              className="filter-input"
            />
            <input
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              placeholder="Instrument"
              className="filter-input"
            />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Grad"
              className="filter-input"
            />
            <input
              type="number"
              min="0"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              placeholder="Maks budžet €"
              className="filter-input"
            />
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="filter-input"
            />
            <label className="filter-select-wrap">
              <SlidersHorizontal size={15} />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="filter-select"
              >
                <option value="recommended">Preporučeni</option>
                <option value="rating">Najbolje ocenjeni</option>
                <option value="priceAsc">Najpovoljniji</option>
                <option value="name">Naziv A-Z</option>
              </select>
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="results-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : musicians.length > 0 ? (
          <div className="results-grid">
            {musicians.map((musician) => (
              <article key={musician.id} className="result-card group">
                <Link href={`/muzicari/${musician.id}`}>
                  <div className="result-image-wrap relative aspect-[1/0.72] overflow-hidden">
                    {musician.img ? (
                      <img src={musician.img} alt={musician.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" loading="lazy" />
                    ) : (
                      <div className="result-image-fallback">
                        <Music2 size={38} />
                      </div>
                    )}
                    {(musician.source === 'demo' || String(musician.id || '').startsWith('demo-musician-') || musician.demo) ? (
                      <span className="absolute left-2 top-2 rounded-full bg-[#007AFF] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                        Demo
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-start justify-between gap-2">
                    <h3 className="result-name">{musician.name}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${musician.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {musician.isAvailable ? 'Dostupan' : 'Zauzet'}
                    </span>
                  </div>

                  <p className="result-instrument">{musician.primaryInstrument}</p>
                  <p className="result-meta"><MapPin size={13} /> {musician.city}</p>
                  <p className="result-bio">{musician.bio || 'Profil bez dodatnog opisa.'}</p>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="result-rating">Ocena {Number(musician.rating || 0).toFixed(1)}</span>
                    <span className="result-price">
                      {musician.priceFromEur != null ? `${musician.priceFromEur}€+` : 'Cena po dogovoru'}
                    </span>
                  </div>
                  {(musician.source === 'demo' || String(musician.id || '').startsWith('demo-musician-') || musician.demo) ? (
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#007AFF]">
                      Demo profil za prikaz
                    </p>
                  ) : null}
                </Link>

                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                  <SocialShareActions
                    compact
                    url={`/muzicari/${musician.id}`}
                    title={`${musician.name} — Muzičar | Pronađi Bend`}
                    text={`Pogledaj profil muzičara ${musician.name} na platformi Pronađi Bend.`}
                  />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white">
              <Music2 size={28} className="text-slate-300" />
            </div>
            <h3 className="mt-4 text-xl font-bold">Nema rezultata</h3>
            <p className="mt-2 text-slate-500">Pokušaj sa drugim instrumentom, gradom ili budžetom.</p>
          </div>
        )}
      </main>

      <style jsx>{`
        .musician-search-page {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(77, 93, 232, 0.18), transparent 55%),
            #030308;
          padding-bottom: 4rem;
        }
        .musician-search-main {
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
          gap: 1rem;
        }
        .search-title {
          margin: 0;
          font-size: clamp(1.9rem, 4vw, 2.8rem);
          font-weight: 900;
          line-height: 1.1;
          letter-spacing: -0.03em;
          color: var(--text);
        }
        .search-title span {
          color: var(--accent-secondary);
        }
        .search-subtitle {
          margin: 0.45rem 0 0;
          color: var(--text-muted);
          font-size: 1rem;
          line-height: 1.55;
        }
        .results-pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: var(--text);
          padding: 0.45rem 0.85rem;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .filters-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 0.65rem;
        }
        .filter-input,
        .filter-select-wrap {
          min-height: 48px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: var(--text);
          font-size: 0.9rem;
          font-weight: 600;
        }
        .filter-input {
          padding: 0 0.9rem;
          outline: none;
        }
        .filter-input:focus {
          border-color: var(--accent-secondary);
          box-shadow: 0 0 0 1px rgba(205, 166, 103, 0.35);
        }
        .filter-select-wrap {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0 0.85rem;
          color: var(--text-muted);
        }
        .filter-select {
          width: 100%;
          border: 0;
          outline: none;
          background: transparent;
          font-weight: 700;
          color: var(--text);
          font-size: 0.84rem;
        }
        .filter-select option {
          color: #050505;
          background: #f3f4f6;
        }
        .results-grid {
          margin-top: 1.4rem;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.25rem;
        }
        .skeleton-card {
          height: 300px;
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          animation: pulse 1.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.55;
          }
        }
        .result-card {
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(9, 9, 20, 0.9);
          padding: 1rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .result-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 26px 60px rgba(0, 0, 0, 0.55);
        }
        .result-image-wrap {
          border-radius: 16px;
          background: #141427;
        }
        .result-image-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          color: var(--text-muted);
        }
        .result-name {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 900;
          color: var(--text);
          line-height: 1.2;
        }
        .result-instrument {
          margin: 0.35rem 0 0;
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--accent-secondary);
        }
        .result-meta {
          margin: 0.25rem 0 0;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.82rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        .result-bio {
          margin: 0.5rem 0 0;
          color: var(--text-muted);
          font-size: 0.86rem;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .result-rating {
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--accent-primary);
        }
        .result-price {
          font-weight: 800;
          color: var(--text);
        }
        .empty-state {
          margin-top: 1.5rem;
          border-radius: 24px;
          border: 1px dashed rgba(255, 255, 255, 0.2);
          background: rgba(8, 8, 18, 0.8);
          padding: 2.5rem;
          text-align: center;
          color: var(--text);
        }
        .empty-state p {
          color: var(--text-muted);
        }
        @media (max-width: 992px) {
          .filters-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .results-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 640px) {
          .musician-search-main {
            padding-top: 7rem;
          }
          .filters-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .results-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .search-hero-card {
            padding: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}
