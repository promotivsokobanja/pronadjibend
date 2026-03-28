import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="container"
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
        textAlign: 'center',
        gap: '1rem',
      }}
    >
      <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>404</h1>
      <p style={{ color: '#64748b', maxWidth: 400 }}>
        Stranica ne postoji ili je uklonjena.
      </p>
      <Link href="/" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
        Na početnu
      </Link>
    </div>
  );
}
