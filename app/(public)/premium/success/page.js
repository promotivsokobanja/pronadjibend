import Link from 'next/link';

export default function PremiumSuccessPage() {
  return (
    <div className="container" style={{ paddingTop: '9rem', paddingBottom: '5rem' }}>
      <div
        style={{
          maxWidth: 620,
          margin: '0 auto',
          background: '#fff',
          border: '1px solid #d1fae5',
          borderRadius: 24,
          padding: '2rem',
        }}
      >
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#047857' }}>
          Premium aktiviran
        </h1>
        <p style={{ color: '#64748b', marginBottom: '1rem' }}>
          Hvala na kupovini. Premium paket je uspešno pokrenut.
        </p>
        <Link href="/bands" style={{ color: '#007aff', fontWeight: 700 }}>
          Nastavi na portal
        </Link>
      </div>
    </div>
  );
}
