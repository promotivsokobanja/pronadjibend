'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PremiumCheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Neuspešno pokretanje checkout-a.');
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err.message || 'Došlo je do greške.');
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '9rem', paddingBottom: '5rem' }}>
      <div
        style={{
          maxWidth: 620,
          margin: '0 auto',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 24,
          padding: '2rem',
        }}
      >
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Premium Venue</h1>
        <p style={{ color: '#64748b', marginBottom: '1.25rem' }}>
          Aktiviraj Premium i otključaj Live Request, prioritetni booking i promociju na platformi.
        </p>
        <ul style={{ marginBottom: '1.25rem', color: '#334155', lineHeight: 1.8 }}>
          <li>Live Request Sistem</li>
          <li>Prioritetni Booking</li>
          <li>Promocija na platformi</li>
        </ul>
        <p style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '1rem' }}>49 EUR / mesec</p>
        <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, color: '#334155' }}>
          Email za naplatu
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vas@email.com"
          style={{
            width: '100%',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            padding: '10px 12px',
            marginBottom: '1rem',
          }}
          required
        />
        {error && (
          <p style={{ color: '#dc2626', marginBottom: '1rem' }}>
            {error}
          </p>
        )}
        <button className="btn btn-primary" onClick={handleCheckout} disabled={loading || !email}>
          {loading ? 'Pokretanje...' : 'Nastavi na plaćanje'}
        </button>
        <div style={{ marginTop: '1rem' }}>
          <Link href="/login?plan=premium" style={{ color: '#007aff', fontWeight: 700 }}>
            Nazad na prijavu
          </Link>
        </div>
      </div>
    </div>
  );
}
