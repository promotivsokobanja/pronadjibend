'use client';

import { io } from 'socket.io-client';
import { useEffect, useMemo, useState } from 'react';

const STATUS_ORDER = ['pending', 'accepted', 'played', 'rejected'];
const POLL_INTERVAL_MS = 5000;

function sortByStatusAndTime(items) {
  return [...items].sort((a, b) => {
    const statusDelta =
      STATUS_ORDER.indexOf(a.status || 'pending') - STATUS_ORDER.indexOf(b.status || 'pending');
    if (statusDelta !== 0) return statusDelta;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export default function DashboardPage() {
  const [bandId, setBandId] = useState('');
  const [inputBandId, setInputBandId] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [realtimeMode, setRealtimeMode] = useState('idle');

  async function fetchRequests(currentBandId) {
    if (!currentBandId) return;
    const res = await fetch(`/api/live-requests?bandId=${encodeURIComponent(currentBandId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Ne mogu da učitam zahteve.');
    const data = await res.json();
    setRequests(Array.isArray(data) ? sortByStatusAndTime(data) : []);
  }

  useEffect(() => {
    if (!bandId) return undefined;

    let disposed = false;
    let socket;
    let pollInterval;
    let refreshTimeout;

    function scheduleRefresh(delayMs = 250) {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        fetchRequests(bandId).catch(() => {});
      }, delayMs);
    }

    function startPollingFallback() {
      if (pollInterval) return;
      setRealtimeMode('polling');
      pollInterval = setInterval(() => {
        fetchRequests(bandId).catch(() => {});
      }, POLL_INTERVAL_MS);
    }

    function stopPollingFallback() {
      if (!pollInterval) return;
      clearInterval(pollInterval);
      pollInterval = undefined;
    }

    async function init() {
      try {
        setError('');
        setLoading(true);
        await fetchRequests(bandId);
      } catch (e) {
        if (!disposed) setError(e.message || 'Greška pri učitavanju.');
      } finally {
        if (!disposed) setLoading(false);
      }

      try {
        await fetch('/api/socket');
        socket = io({ path: '/api/socket/io' });
        socket.on('connect', () => {
          stopPollingFallback();
          setRealtimeMode('socket');
          socket.emit('join_band', bandId);
        });
        socket.on('disconnect', () => {
          if (disposed) return;
          startPollingFallback();
        });
        socket.on('connect_error', () => {
          if (disposed) return;
          startPollingFallback();
        });
        socket.on('live_request_event', (payload) => {
          if (!payload || payload.bandId !== bandId) return;
          scheduleRefresh();
        });
      } catch {
        if (!disposed) startPollingFallback();
      }
    }

    init();

    return () => {
      disposed = true;
      if (refreshTimeout) clearTimeout(refreshTimeout);
      stopPollingFallback();
      if (socket) socket.close();
      setRealtimeMode('idle');
    };
  }, [bandId]);

  const pendingCount = useMemo(
    () => requests.filter((item) => item.status === 'pending').length,
    [requests]
  );

  async function updateStatus(id, status) {
    try {
      const res = await fetch('/api/live-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error('Promena statusa nije uspela.');
      await fetchRequests(bandId);
    } catch (e) {
      setError(e.message || 'Greška pri promeni statusa.');
    }
  }

  return (
    <section className="space-y-4">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">Band Dashboard</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">Live narudžbine</h1>
        <p className="mt-2 text-sm text-slate-600">
          Realtime prikaz preko Socket.io sa polling fallback-om.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Band ID
        </label>
        <div className="mt-2 flex gap-2">
          <input
            value={inputBandId}
            onChange={(e) => setInputBandId(e.target.value)}
            placeholder="Unesi bandId"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500/30 transition focus:border-indigo-500 focus:ring"
          />
          <button
            type="button"
            onClick={() => setBandId(inputBandId.trim())}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Učitaj
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Pending: {pendingCount}</p>
        <p className="mt-1 text-xs text-slate-500">
          Realtime: {realtimeMode === 'socket' ? 'socket' : realtimeMode === 'polling' ? 'polling fallback' : 'idle'}
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Zahtevi</h2>
        {loading ? <p className="mt-3 text-sm text-slate-500">Učitavanje...</p> : null}

        <ul className="mt-3 space-y-2">
          {requests.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">
                Sto {item.tableNum} - {item.song}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {item.requestType} · {item.status}
                {item.tipAmountRsd ? ` · ${item.tipAmountRsd} RSD` : ''}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => updateStatus(item.id, 'ACCEPTED')}
                  className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700"
                >
                  ACCEPT
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(item.id, 'PLAYED')}
                  className="rounded-lg border border-indigo-300 px-2 py-1 text-xs font-semibold text-indigo-700"
                >
                  PLAYED
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(item.id, 'REJECTED')}
                  className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                >
                  REJECT
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
