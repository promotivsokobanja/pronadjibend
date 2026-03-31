'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('GlobalError:', error);
  }, [error]);

  return (
    <html lang="sr">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
          padding: '2rem',
          background: '#0f172a',
          color: '#e2e8f0',
        }}
      >
        <h1 style={{ fontSize: '1.25rem' }}>Greška aplikacije</h1>
        <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
          Osvežite stranicu ili pokušajte ponovo.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 8,
            border: 'none',
            background: '#3b82f6',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Pokušaj ponovo
        </button>
      </body>
    </html>
  );
}
