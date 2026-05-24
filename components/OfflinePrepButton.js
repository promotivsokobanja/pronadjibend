'use client';

import { useState, useEffect, useCallback } from 'react';
import { WifiOff, Check, Loader2 } from 'lucide-react';
import { cacheRepertoire, getCacheMeta } from '../lib/offlineRepertoire';

/**
 * "Pripremi za nastup" button — downloads all repertoire songs into IndexedDB.
 * Works for both band and musician owners.
 *
 * Props:
 *   bandId?: string
 *   musicianId?: string
 *   variant?: 'card' | 'inline' (default 'card')
 */
export default function OfflinePrepButton({ bandId, musicianId, variant = 'card' }) {
  const ownerId = bandId || musicianId;
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [count, setCount] = useState(0);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    if (!ownerId) return;
    getCacheMeta(ownerId).then(setMeta).catch(() => {});
  }, [ownerId]);

  const handlePrep = useCallback(async () => {
    if (!ownerId || status === 'loading') return;
    setStatus('loading');
    try {
      const params = new URLSearchParams();
      if (bandId) params.set('bandId', bandId);
      else if (musicianId) params.set('musicianId', musicianId);

      const resp = await fetch(`/api/songs?${params.toString()}`, { cache: 'no-store' });
      if (!resp.ok) throw new Error('Fetch failed');
      const songs = await resp.json();
      if (!Array.isArray(songs)) throw new Error('Invalid data');

      const cached = await cacheRepertoire(ownerId, songs);
      setCount(cached);
      setStatus('done');
      setMeta({ timestamp: Date.now(), count: cached });

      setTimeout(() => setStatus('idle'), 4000);
    } catch (err) {
      console.error('Offline prep error:', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [ownerId, bandId, musicianId, status]);

  const timeAgo = meta?.timestamp
    ? formatTimeAgo(meta.timestamp)
    : null;

  if (variant === 'inline') {
    return (
      <button
        type="button"
        className="offline-prep-inline"
        onClick={handlePrep}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? (
          <><Loader2 size={16} className="offline-spin" /> Preuzimanje...</>
        ) : status === 'done' ? (
          <><Check size={16} /> Spremno ({count} pesama)</>
        ) : status === 'error' ? (
          <><WifiOff size={16} /> Greška — pokušaj ponovo</>
        ) : (
          <><WifiOff size={16} /> Pripremi offline</>
        )}
        <style jsx>{`
          .offline-prep-inline {
            display: inline-flex; align-items: center; gap: 0.5rem;
            padding: 0.6rem 1rem; border-radius: 999px;
            background: rgba(139, 92, 246, 0.12); border: 1px solid rgba(139, 92, 246, 0.25);
            color: #c4b5fd; font-size: 0.8rem; font-weight: 700;
            cursor: pointer; transition: 0.2s;
          }
          .offline-prep-inline:hover:not(:disabled) {
            background: rgba(139, 92, 246, 0.2); border-color: rgba(139, 92, 246, 0.4);
          }
          .offline-prep-inline:disabled { opacity: 0.7; cursor: wait; }
          .offline-prep-inline :global(.offline-spin) { animation: offline-spin 1s linear infinite; }
          @keyframes offline-spin { to { transform: rotate(360deg); } }
        `}</style>
      </button>
    );
  }

  // Card variant (for panel-grid)
  const isDone = status === 'done';
  const cardStyle = {
    all: 'unset',
    cursor: status === 'loading' ? 'wait' : 'pointer',
    display: 'block',
  };
  const innerStyle = {
    background: isDone ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.04)',
    borderRadius: '22px',
    border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
    padding: '1.25rem',
    minHeight: '168px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.72rem',
    transition: 'transform 0.2s, border-color 0.2s, background 0.2s',
  };
  const iconStyle = {
    width: '46px',
    height: '46px',
    borderRadius: '16px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: isDone ? 'rgba(16, 185, 129, 0.12)' : 'rgba(139, 92, 246, 0.12)',
    color: isDone ? '#10b981' : '#a78bfa',
  };
  const h3Style = { margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 };
  const pStyle = { margin: 0, fontSize: '0.85rem', color: 'rgba(226, 232, 240, 0.7)', lineHeight: 1.4 };
  const ctaStyle = { marginTop: 'auto', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isDone ? '#10b981' : '#a78bfa' };

  return (
    <button type="button" style={cardStyle} onClick={handlePrep} disabled={status === 'loading'} className="offline-card-btn">
      <div className="offline-card-inner" style={innerStyle}>
        <div style={iconStyle}>
          {status === 'loading' ? <Loader2 size={20} className="offline-spin" /> : isDone ? <Check size={20} /> : <WifiOff size={20} />}
        </div>
        <div>
          <h3 style={h3Style}>
            {status === 'loading' ? 'Preuzimanje...' : isDone ? `Spremno (${count})` : status === 'error' ? 'Greška' : 'Pripremi za nastup'}
          </h3>
          <p style={pStyle}>
            {isDone
              ? 'Pesmarica dostupna i bez interneta.'
              : status === 'error'
                ? 'Pokušajte ponovo kada imate signal.'
                : timeAgo
                  ? `Poslednje: ${timeAgo} (${meta.count} pesama)`
                  : 'Preuzmi repertoar za rad bez mreže.'}
          </p>
        </div>
        <span style={ctaStyle}>
          {status === 'loading' ? '...' : isDone ? '✓' : 'Preuzmi'}
        </span>
      </div>
      <style jsx>{`
        .offline-card-btn:hover .offline-card-inner {
          transform: translateY(-4px);
          border-color: rgba(139, 92, 246, 0.3) !important;
          background: rgba(255, 255, 255, 0.07) !important;
        }
        :global(.offline-spin) { animation: offline-spin 1s linear infinite; }
        @keyframes offline-spin { to { transform: rotate(360deg); } }
      `}</style>
    </button>
  );
}

function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'upravo';
  if (minutes < 60) return `pre ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `pre ${hours}h`;
  const days = Math.floor(hours / 24);
  return `pre ${days} dana`;
}
