'use client';

import Link from 'next/link';
import { ArrowLeft, MapPin, Music2, CalendarDays, Star, Euro, Clock3 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('sr-Latn-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function extractVideoEmbed(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtu.be')) {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }

    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      const id = parsed.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      const embedded = parsed.pathname.split('/embed/')[1];
      return embedded ? `https://www.youtube.com/embed/${embedded}` : '';
    }

    if (host.includes('vimeo.com')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      const id = parts[parts.length - 1];
      return /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : '';
    }

    return '';
  } catch {
    return '';
  }
}

export default function MusicianProfileClient({ musicianId }) {
  const [musician, setMusician] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState(null);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteForm, setInviteForm] = useState({
    eventDate: '',
    location: '',
    feeEur: '',
    message: '',
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/musicians/${musicianId}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setError(data?.error || 'Profil nije pronađen.');
          setMusician(null);
          return;
        }

        setMusician(data);
      } catch {
        if (!cancelled) {
          setError('Došlo je do greške pri učitavanju profila.');
          setMusician(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [musicianId]);

  useEffect(() => {
    let cancelled = false;

    const loadViewer = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !data?.user) {
          setViewer(null);
          return;
        }
        setViewer(data.user);
      } catch {
        if (!cancelled) setViewer(null);
      }
    };

    loadViewer();
    return () => {
      cancelled = true;
    };
  }, []);

  const embeddedVideo = useMemo(() => extractVideoEmbed(musician?.videoUrl), [musician?.videoUrl]);
  const isDemoMusician = String(musician?.id || '').startsWith('demo-musician-');
  const canInvite = Boolean(viewer?.bandId) && !isDemoMusician;

  const handleInviteChange = (key, value) => {
    setInviteForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!musician?.id || !canInvite) return;

    setInviteSending(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      const res = await fetch('/api/musicians/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          musicianId: musician.id,
          eventDate: inviteForm.eventDate || null,
          location: inviteForm.location || null,
          feeEur: inviteForm.feeEur || null,
          message: inviteForm.message || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Slanje poziva nije uspelo.');
      }

      setInviteSuccess('Poziv je uspešno poslat muzičaru.');
      setInviteForm({ eventDate: '', location: '', feeEur: '', message: '' });
    } catch (err) {
      setInviteError(err?.message || 'Greška pri slanju poziva.');
    } finally {
      setInviteSending(false);
    }
  };

  const availabilityPreview = useMemo(() => {
    if (!Array.isArray(musician?.availabilities)) return [];
    return musician.availabilities.slice(0, 8);
  }, [musician?.availabilities]);

  if (isLoading) {
    return (
      <div className="page-below-fixed-nav container py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">Učitavanje profila muzičara…</div>
      </div>
    );
  }

  if (error || !musician) {
    return (
      <div className="page-below-fixed-nav container py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700">{error || 'Muzičar nije pronađen.'}</div>
      </div>
    );
  }

  return (
    <div className="page-below-fixed-nav min-h-screen bg-white">
      <main className="container py-8 md:py-10">
        <Link href="/muzicari" className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-900">
          <ArrowLeft size={14} /> Nazad na pretragu
        </Link>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
              {musician.img ? (
                <img src={musician.img} alt={musician.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <Music2 size={48} />
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-slate-900 md:text-3xl">{musician.name}</h1>
                <p className="mt-1 text-sm font-semibold text-[#007AFF]">{musician.primaryInstrument}</p>
                {isDemoMusician ? (
                  <p className="mt-1 inline-flex items-center rounded-full bg-[#007AFF]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#007AFF]">
                    Demo profil
                  </p>
                ) : null}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${musician.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {musician.isAvailable ? 'Dostupan za angažman' : 'Trenutno zauzet'}
              </span>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <p className="inline-flex items-center gap-2"><MapPin size={15} /> {musician.city}</p>
              <p className="inline-flex items-center gap-2"><Star size={15} /> Ocena {Number(musician.rating || 0).toFixed(1)}</p>
              <p className="inline-flex items-center gap-2"><Euro size={15} />
                {musician.priceFromEur != null
                  ? musician.priceToEur != null
                    ? `${musician.priceFromEur}€ - ${musician.priceToEur}€`
                    : `${musician.priceFromEur}€+`
                  : 'Cena po dogovoru'}
              </p>
              <p className="inline-flex items-center gap-2"><Clock3 size={15} />
                {musician.experienceYears != null ? `${musician.experienceYears} godina iskustva` : 'Iskustvo po dogovoru'}
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Žanrovi</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{musician.genres || 'Nije navedeno'}</p>
            </div>

            <div className="mt-4">
              <p className="text-sm leading-7 text-slate-700">{musician.bio || 'Muzičar još nije dodao detaljan opis profila.'}</p>
              {isDemoMusician ? (
                <p className="mt-2 text-xs font-semibold text-[#007AFF]">
                  Ovaj profil je demo prikaz za pregled funkcionalnosti.
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-base font-black text-slate-900">Dostupnost (naredni termini)</h2>
              {availabilityPreview.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {availabilityPreview.map((item, idx) => (
                    <li key={`${item.date}-${idx}`} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                      <span className="inline-flex items-center gap-2 text-slate-700"><CalendarDays size={14} /> {formatDate(item.date)}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.isAvailable ? 'Slobodan' : 'Zauzet'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Nema javno unetih termina. Pošaljite upit za proveru dostupnosti.</p>
              )}
            </div>

            {embeddedVideo && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="text-base font-black text-slate-900">Video prezentacija</h2>
                <iframe
                  src={embeddedVideo}
                  title={`${musician.name} video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="mt-3 h-56 w-full rounded-xl border border-slate-200 bg-black"
                />
              </div>
            )}

            <div className="rounded-2xl border border-[#007AFF]/20 bg-[#F5FAFF] p-4 sm:p-5">
              <h2 className="text-base font-black text-slate-900">Pošalji upit za saradnju</h2>
              {!viewer ? (
                <p className="mt-1 text-sm text-slate-600">Prijavite se kao bend nalog da biste poslali poziv za saradnju.</p>
              ) : !viewer.bandId ? (
                <p className="mt-1 text-sm text-slate-600">Samo bend nalozi mogu slati pozive muzičarima.</p>
              ) : isDemoMusician ? (
                <p className="mt-1 text-sm text-slate-600">Demo profili ne primaju pozive. Izaberite profil iz baze.</p>
              ) : (
                <form className="mt-3 space-y-3" onSubmit={handleInviteSubmit}>
                  {inviteError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{inviteError}</div>
                  ) : null}
                  {inviteSuccess ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{inviteSuccess}</div>
                  ) : null}

                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="date"
                      value={inviteForm.eventDate}
                      onChange={(e) => handleInviteChange('eventDate', e.target.value)}
                      className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Honorаr (€)"
                      value={inviteForm.feeEur}
                      onChange={(e) => handleInviteChange('feeEur', e.target.value)}
                      className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Lokacija nastupa"
                    value={inviteForm.location}
                    onChange={(e) => handleInviteChange('location', e.target.value)}
                    className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12"
                  />

                  <textarea
                    rows={4}
                    placeholder="Poruka muzičaru (termin, uslovi, detalji...)"
                    value={inviteForm.message}
                    onChange={(e) => handleInviteChange('message', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12"
                  />

                  <button
                    type="submit"
                    disabled={inviteSending}
                    className="inline-flex items-center justify-center rounded-full bg-[#007AFF] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0069db] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {inviteSending ? 'Slanje...' : 'Pošalji poziv'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
