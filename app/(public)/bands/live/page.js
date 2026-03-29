'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LiveDashboard from '../../../../components/LiveDashboard';

export default function LivePage() {
  const router = useRouter();
  const [bandId, setBandId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!r.ok) {
          router.replace('/login');
          return;
        }
        const body = await r.json();
        const user = body?.user;
        if (!user?.bandId) {
          if (!cancelled) {
            const msg =
              user?.role === 'ADMIN'
                ? 'Live režim zahteva bend profil. Kao administrator koristite Admin panel ili MIDI biblioteku, ili se ulogujte kao muzičar sa povezanim bendom.'
                : 'Live režim je dostupan samo nalozima muzičara sa povezanim bendom.';
            setError(msg);
            setLoading(false);
          }
          return;
        }
        if (!cancelled) {
          setBandId(user.bandId);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('Ne možemo učitati nalog. Pokušajte ponovo.');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="live-page-wrapper" style={{ padding: '6rem 1rem', color: '#fff', textAlign: 'center' }}>
        Učitavanje Live režima…
      </div>
    );
  }

  if (error || !bandId) {
    return (
      <div className="live-page-wrapper" style={{ padding: '6rem 1rem', color: '#fca5a5', textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
        <p style={{ marginBottom: '1rem' }}>{error || 'Nedostaje ID benda.'}</p>
        <a href="/bands" style={{ color: '#38bdf8' }}>
          Nazad na kontrolnu tablu
        </a>
      </div>
    );
  }

  return (
    <div className="live-page-wrapper">
      <LiveDashboard bandId={bandId} />

      <style jsx global>{`
        .navbar,
        footer {
          display: none !important;
        }

        html,
        body {
          overflow: hidden;
          background: #000;
          height: 100%;
          height: 100dvh;
          margin: 0;
          /* Manje „ukočenosti” na mobilnom: brži tap, bez 300ms kašnjenja */
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        .live-page-wrapper {
          min-height: 100dvh;
          height: 100dvh;
          max-height: 100dvh;
        }
      `}</style>
    </div>
  );
}
