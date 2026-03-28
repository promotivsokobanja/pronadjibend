import Link from 'next/link';

export default function PremiumCancelPage() {
  return (
    <div className="container" style={{ paddingTop: '9rem', paddingBottom: '5rem' }}>
      <div
        style={{
          maxWidth: 620,
          margin: '0 auto',
          background: '#fff',
          border: '1px solid #fde68a',
          borderRadius: 24,
          padding: '2rem',
        }}
      >
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#92400e' }}>
          Plaćanje je otkazano
        </h1>
        <p style={{ color: '#64748b', marginBottom: '1rem' }}>
          Nije izvršena naplata. Možete pokušati ponovo kada budete spremni.
        </p>
        <Link href="/premium/checkout" style={{ color: '#007aff', fontWeight: 700 }}>
          Probaj ponovo
        </Link>
      </div>
    </div>
  );
}
