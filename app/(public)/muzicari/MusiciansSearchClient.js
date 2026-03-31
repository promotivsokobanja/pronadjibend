'use client';

import Link from 'next/link';
import { Music2, MapPin, SlidersHorizontal } from 'lucide-react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
    <div className="search-page theme-light page-below-fixed-nav min-h-screen bg-white">
      <main className="container pb-10 pt-6 md:pb-14 md:pt-10">
        <div className="mb-8 flex flex-col gap-6 border-b border-slate-200/70 pb-8 md:mb-10 md:pb-8">
          <div className="flex items-start justify-between gap-4 max-md:flex-col">
            <div>
              <h1 className="text-[1.65rem] font-black leading-[1.15] tracking-[-0.03em] text-slate-900 sm:text-3xl md:text-4xl">
                Pronađi <span className="text-[#007AFF]">muzičara</span> za bend
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Bubnjar, vokal, gitarista, klavijaturista i drugi profili sa dostupnošću i cenom.
              </p>
            </div>
            <span className="inline-flex h-fit items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {musicians.length} rezultata · {sortedLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ime / ključna reč"
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12"
            />
            <input
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              placeholder="Instrument"
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12"
            />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Grad"
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12"
            />
            <input
              type="number"
              min="0"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              placeholder="Maks budžet €"
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12"
            />
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12"
            />
            <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              <SlidersHorizontal size={15} />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full bg-transparent outline-none"
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
          <div className="mt-4 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
            ))}
          </div>
        ) : musicians.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {musicians.map((musician) => (
              <Link key={musician.id} href={`/muzicari/${musician.id}`} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative aspect-[1/0.72] overflow-hidden rounded-xl bg-slate-100">
                  {musician.img ? (
                    <img src={musician.img} alt={musician.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
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
                  <h3 className="text-lg font-black text-slate-900">{musician.name}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${musician.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {musician.isAvailable ? 'Dostupan' : 'Zauzet'}
                  </span>
                </div>

                <p className="mt-1 text-sm font-semibold text-[#007AFF]">{musician.primaryInstrument}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500"><MapPin size={13} /> {musician.city}</p>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{musician.bio || 'Profil bez dodatnog opisa.'}</p>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Ocena {Number(musician.rating || 0).toFixed(1)}</span>
                  <span className="text-sm font-black text-slate-900">
                    {musician.priceFromEur != null ? `${musician.priceFromEur}€+` : 'Cena po dogovoru'}
                  </span>
                </div>
                {(musician.source === 'demo' || String(musician.id || '').startsWith('demo-musician-') || musician.demo) ? (
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#007AFF]">
                    Demo profil za prikaz
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-200 bg-[#F7F7F7] px-6 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white">
              <Music2 size={28} className="text-slate-300" />
            </div>
            <h3 className="mt-4 text-xl font-bold">Nema rezultata</h3>
            <p className="mt-2 text-slate-500">Pokušaj sa drugim instrumentom, gradom ili budžetom.</p>
          </div>
        )}
      </main>
    </div>
  );
}
