'use client';

import { useEffect, useMemo, useState } from 'react';

function formatSongLabel(song) {
  const artist = song?.artist ? ` - ${song.artist}` : '';
  return `${song?.title || 'Nepoznata pesma'}${artist}`;
}

export default function LiveGuestClient({ bandId }) {
  const [tableNum, setTableNum] = useState('');
  const [search, setSearch] = useState('');
  const [songs, setSongs] = useState([]);
  const [waiterTipRsd, setWaiterTipRsd] = useState('');
  const [waiterTipMessage, setWaiterTipMessage] = useState('');
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [submittingSongId, setSubmittingSongId] = useState('');
  const [submittingTip, setSubmittingTip] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadSongs() {
      setLoadingSongs(true);
      setError('');
      try {
        const qp = new URLSearchParams({
          bandId,
          limit: '120',
        });
        if (search.trim()) qp.set('search', search.trim());

        const res = await fetch(`/api/songs?${qp.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Ne mogu da učitam repertorar.');
        const data = await res.json();
        if (!active) return;
        setSongs(Array.isArray(data) ? data : []);
      } catch (e) {
        if (active) setError(e.message || 'Greška pri učitavanju pesama.');
      } finally {
        if (active) setLoadingSongs(false);
      }
    }

    loadSongs();
    return () => {
      active = false;
    };
  }, [bandId, search]);

  const canSubmit = useMemo(() => tableNum.trim().length > 0, [tableNum]);

  async function submitSongRequest(songId) {
    if (!canSubmit) {
      setError('Unesi broj stola pre slanja zahteva.');
      return;
    }

    setSubmittingSongId(songId);
    setError('');
    setFeedback('');

    const tipParsed = Number(waiterTipRsd);
    const tipAmount = Number.isFinite(tipParsed) && tipParsed > 0 ? Math.floor(tipParsed) : 0;

    try {
      const res = await fetch('/api/live-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'SONG',
          songId,
          bandId,
          tableNum: tableNum.trim(),
          waiterTipRsd: tipAmount > 0 ? tipAmount : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Slanje zahteva nije uspelo.');
      setFeedback('Zahtev je uspešno poslat.');
    } catch (e) {
      setError(e.message || 'Greška pri slanju zahteva.');
    } finally {
      setSubmittingSongId('');
    }
  }

  async function submitWaiterTip() {
    if (!canSubmit) {
      setError('Unesi broj stola pre slanja bakšiša.');
      return;
    }

    setSubmittingTip(true);
    setError('');
    setFeedback('');

    try {
      const res = await fetch('/api/live-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'WAITER_TIP',
          bandId,
          tableNum: tableNum.trim(),
          message: waiterTipMessage.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Slanje bakšiša nije uspelo.');
      setFeedback('Bakšiš poruka je uspešno poslata bendu.');
      setWaiterTipMessage('');
    } catch (e) {
      setError(e.message || 'Greška pri slanju bakšiša.');
    } finally {
      setSubmittingTip(false);
    }
  }

  return (
    <section className="space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Live Gost Stranica</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">Bend sesija: {bandId}</h1>
        <p className="mt-2 text-sm text-slate-600">Naruči pesmu i pošalji bakšiš poruku preko konobara.</p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Broj stola
        </label>
        <input
          value={tableNum}
          onChange={(e) => setTableNum(e.target.value)}
          placeholder="npr. 12"
          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:border-emerald-500 focus:ring"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Repertoar</h2>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pretraži pesmu ili izvođača..."
            className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:border-emerald-500 focus:ring"
          />

          {loadingSongs ? <p className="mt-3 text-sm text-slate-500">Učitavanje pesama...</p> : null}

          <ul className="mt-3 max-h-[26rem] space-y-2 overflow-auto pr-1">
            {songs.map((song) => (
              <li key={song.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">{formatSongLabel(song)}</p>
                <button
                  type="button"
                  onClick={() => submitSongRequest(song.id)}
                  disabled={submittingSongId === song.id}
                  className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-70"
                >
                  {submittingSongId === song.id ? 'Šaljem...' : 'Naruči pesmu'}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Bakšiš preko konobara</h2>
          <p className="mt-2 text-sm text-slate-600">
            Dodaj poruku za bend. Za pesmu sa bakšišem koristi iznos ispod i pošalji zahtev iz repertoara.
          </p>

          <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Iznos bakšiša uz pesmu (RSD)
          </label>
          <input
            type="number"
            min="0"
            value={waiterTipRsd}
            onChange={(e) => setWaiterTipRsd(e.target.value)}
            placeholder="0"
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:border-emerald-500 focus:ring"
          />

          <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Poruka bakšiša (samo konobar)
          </label>
          <textarea
            value={waiterTipMessage}
            onChange={(e) => setWaiterTipMessage(e.target.value)}
            rows={4}
            placeholder="Sto 12 časti muziku 500 RSD"
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:border-emerald-500 focus:ring"
          />

          <button
            type="button"
            onClick={submitWaiterTip}
            disabled={submittingTip}
            className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
          >
            {submittingTip ? 'Šaljem...' : 'Pošalji bakšiš poruku'}
          </button>
        </div>
      </div>

      {feedback ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          {feedback}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
