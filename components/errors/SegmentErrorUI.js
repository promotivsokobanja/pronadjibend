'use client';

import { useEffect } from 'react';

export default function SegmentErrorUI({ error, reset }) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        gap: '1rem',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Došlo je do greške</h1>
      <p style={{ color: '#64748b', maxWidth: 420 }}>
        Stranica nije mogla da se učita. Možete pokušati ponovo ili se vratiti na početnu.
      </p>
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: 10,
            border: 'none',
            background: '#3b82f6',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Pokušaj ponovo
        </button>
        <a
          href="/"
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            color: '#0f172a',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Početna
        </a>
      </div>
    </div>
  );
}
