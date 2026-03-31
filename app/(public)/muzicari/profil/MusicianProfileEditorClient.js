'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save, UserRound, Mail, CalendarDays, Euro, MapPin } from 'lucide-react';

const initialForm = {
  name: '',
  primaryInstrument: '',
  genres: '',
  city: '',
  priceFromEur: '',
  priceToEur: '',
  experienceYears: '',
  bio: '',
  img: '',
  videoUrl: '',
  isAvailable: true,
};

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('sr-Latn-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function MusicianProfileEditorClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewer, setViewer] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [invites, setInvites] = useState([]);
  const [inviteMutation, setInviteMutation] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [meRes, profileRes, invitesRes] = await Promise.all([
          fetch('/api/auth/me', { cache: 'no-store' }),
          fetch('/api/musicians/profile', { cache: 'no-store' }),
          fetch('/api/musicians/invites', { cache: 'no-store' }),
        ]);

        const meData = await meRes.json().catch(() => ({}));
        const profileData = await profileRes.json().catch(() => ({}));
        const invitesData = await invitesRes.json().catch(() => ({}));

        if (cancelled) return;

        if (!meRes.ok || !meData?.user) {
          setError('Morate biti prijavljeni da biste uređivali profil muzičara.');
          setViewer(null);
          return;
        }

        setViewer(meData.user);

        if (profileRes.ok && profileData?.profile) {
          const p = profileData.profile;
          setForm({
            name: p.name || '',
            primaryInstrument: p.primaryInstrument || '',
            genres: p.genres || '',
            city: p.city || '',
            priceFromEur: p.priceFromEur != null ? String(p.priceFromEur) : '',
            priceToEur: p.priceToEur != null ? String(p.priceToEur) : '',
            experienceYears: p.experienceYears != null ? String(p.experienceYears) : '',
            bio: p.bio || '',
            img: p.img || '',
            videoUrl: p.videoUrl || '',
            isAvailable: p.isAvailable !== false,
          });
        }

        if (invitesRes.ok && invitesData?.mode === 'received' && Array.isArray(invitesData.invites)) {
          setInvites(invitesData.invites);
        } else {
          setInvites([]);
        }
      } catch {
        if (!cancelled) setError('Greška pri učitavanju muzičarskog profila.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInviteStatus = async (inviteId, status) => {
    if (!inviteId) return;
    setInviteMutation(inviteId);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/musicians/invites/${encodeURIComponent(inviteId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || 'Izmena statusa nije uspela.');
      }

      setInvites((prev) => prev.map((item) => (item.id === inviteId ? { ...item, status } : item)));
      setSuccess(status === 'ACCEPTED' ? 'Poziv je prihvaćen.' : 'Poziv je odbijen.');
    } catch (err) {
      setError(err?.message || 'Greška pri izmeni statusa poziva.');
    } finally {
      setInviteMutation(null);
    }
  };

  const isBandAccount = Boolean(viewer?.bandId);

  const profilePreview = useMemo(() => {
    const instrument = form.primaryInstrument || 'Instrument';
    const city = form.city || 'Grad';
    const name = form.name || 'Ime muzičara';
    return `${name} • ${instrument} • ${city}`;
  }, [form]);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/musicians/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || 'Čuvanje nije uspelo.');
      }

      setSuccess('Profil muzičara je uspešno sačuvan.');
    } catch (err) {
      setError(err?.message || 'Greška pri čuvanju profila.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-below-fixed-nav min-h-screen bg-white">
      <main className="container py-8 md:py-10">
        <Link href="/muzicari" className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-900">
          <ArrowLeft size={14} /> Nazad na muzičare
        </Link>

        <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Moj nalog</p>
          <h1 className="mt-2 text-2xl font-black text-slate-900 md:text-3xl">Profil muzičara</h1>
          <p className="mt-2 text-sm text-slate-600">Uredite javnu prezentaciju i povećajte šansu da vas bendovi angažuju.</p>
          <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
            <UserRound size={14} /> {profilePreview}
          </p>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">Učitavanje...</div>
        ) : isBandAccount ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            Ovaj ekran je za muzičarske naloge. Trenutno ste prijavljeni kao bend nalog.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div> : null}
              {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{success}</div> : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-semibold text-slate-700">
                  Ime i prezime
                  <input value={form.name} onChange={(e) => onChange('name', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12" required />
                </label>
                <label className="space-y-1 text-sm font-semibold text-slate-700">
                  Primarni instrument
                  <input value={form.primaryInstrument} onChange={(e) => onChange('primaryInstrument', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12" required />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-semibold text-slate-700">
                  Grad
                  <input value={form.city} onChange={(e) => onChange('city', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12" required />
                </label>
                <label className="space-y-1 text-sm font-semibold text-slate-700">
                  Žanrovi
                  <input value={form.genres} onChange={(e) => onChange('genres', e.target.value)} placeholder="Pop, Rock, Narodna" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12" />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 text-sm font-semibold text-slate-700">
                  Cena od (€)
                  <input type="number" min="0" value={form.priceFromEur} onChange={(e) => onChange('priceFromEur', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12" />
                </label>
                <label className="space-y-1 text-sm font-semibold text-slate-700">
                  Cena do (€)
                  <input type="number" min="0" value={form.priceToEur} onChange={(e) => onChange('priceToEur', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12" />
                </label>
                <label className="space-y-1 text-sm font-semibold text-slate-700">
                  Iskustvo (god)
                  <input type="number" min="0" value={form.experienceYears} onChange={(e) => onChange('experienceYears', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12" />
                </label>
              </div>

              <label className="space-y-1 text-sm font-semibold text-slate-700 block">
                Kratka biografija
                <textarea rows={4} value={form.bio} onChange={(e) => onChange('bio', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12" />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-semibold text-slate-700">
                  URL slike
                  <input value={form.img} onChange={(e) => onChange('img', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12" />
                </label>
                <label className="space-y-1 text-sm font-semibold text-slate-700">
                  URL videa
                  <input value={form.videoUrl} onChange={(e) => onChange('videoUrl', e.target.value)} placeholder="YouTube/Vimeo/Cloudinary" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-[#007AFF]/0 transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/12" />
                </label>
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={form.isAvailable} onChange={(e) => onChange('isAvailable', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                Trenutno sam dostupan za angažman
              </label>

              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#007AFF] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0069db] disabled:cursor-not-allowed disabled:opacity-60">
                <Save size={16} /> {saving ? 'Čuvanje...' : 'Sačuvaj profil'}
              </button>
            </form>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-black text-slate-900">Kontakt naloga</h2>
                <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600"><Mail size={15} /> {viewer?.email || '—'}</p>
                <p className="mt-3 text-xs text-slate-500">Javni kontakt bendu se kasnije može proširiti (telefon, društvene mreže).</p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-black text-slate-900">Pristigli pozivi bendova</h2>
                {invites.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">Još nema poziva. Kada bend pošalje poziv, pojaviće se ovde.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {invites.map((inv) => (
                      <li key={inv.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="font-bold text-slate-900">{inv.band?.name || 'Bend'}</p>
                        <div className="mt-1 space-y-1 text-xs font-semibold text-slate-500">
                          {inv.eventDate ? <p className="inline-flex items-center gap-1"><CalendarDays size={13} /> {formatDate(inv.eventDate)}</p> : null}
                          {inv.location ? <p className="inline-flex items-center gap-1"><MapPin size={13} /> {inv.location}</p> : null}
                          {inv.feeEur != null ? <p className="inline-flex items-center gap-1"><Euro size={13} /> {inv.feeEur}€</p> : null}
                        </div>
                        {inv.message ? <p className="mt-2 text-sm text-slate-700">{inv.message}</p> : null}
                        <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[#007AFF]">Status: {inv.status}</p>
                        {inv.status === 'PENDING' ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={inviteMutation === inv.id}
                              onClick={() => handleInviteStatus(inv.id, 'ACCEPTED')}
                              className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Prihvati
                            </button>
                            <button
                              type="button"
                              disabled={inviteMutation === inv.id}
                              onClick={() => handleInviteStatus(inv.id, 'REJECTED')}
                              className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Odbij
                            </button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
