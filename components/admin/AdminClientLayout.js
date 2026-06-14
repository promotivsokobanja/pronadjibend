'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminFetch } from '../../lib/adminFetch';
import {
  LayoutDashboard,
  Users,
  Music2,
  BookOpen,
  Calendar,
  Star,
  MessageSquare,
  Wallet,
  Settings,
  Menu,
  X,
} from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Pregled', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Korisnici', icon: Users },
  { href: '/admin/bands', label: 'Bendovi', icon: Music2 },
  { href: '/admin/pesmarica', label: 'Pesmarica', icon: BookOpen },
  { href: '/admin/pesmarica/predlozi', label: 'Predlozi pesama', icon: BookOpen },
  { href: '/admin/demo-songs', label: 'Autorske Pesme', icon: Music2 },
  { href: '/admin/bookings', label: 'Rezervacije', icon: Calendar },
  { href: '/admin/musician-invites', label: 'Chat pozivi', icon: MessageSquare },
  { href: '/admin/reviews', label: 'Recenzije', icon: Star },
  { href: '/admin/payments', label: 'Uplate', icon: Wallet },
  { href: '/admin/system', label: 'Sistem', icon: Settings },
];

function isDatabaseErrorResponse(status, data) {
  const msg = String(data?.error || '');
  if (status === 503) return true;
  if (/database|baza|DATABASE_URL|reach database/i.test(msg)) return true;
  return false;
}

export default function AdminClientLayout({ children }) {
  const pathname = usePathname();
  const [state, setState] = useState('loading');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await adminFetch('/api/auth/me');
        const data = await r.json().catch(() => ({}));
        if (cancelled) return;

        if (r.ok && data.user?.role === 'ADMIN') {
          setState('ok');
          return;
        }

        if (isDatabaseErrorResponse(r.status, data)) {
          setState('dbdown');
          return;
        }

        if (r.status === 401 || r.status === 404) {
          setState('denied');
          window.location.href = '/login?next=/admin';
          return;
        }

        if (!r.ok || data.user?.role !== 'ADMIN') {
          setState('denied');
          window.location.href = '/login?next=/admin';
          return;
        }
      } catch {
        if (!cancelled) {
          setState('network');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return (
      <div className="admin-app">
        <aside className="admin-sidebar" style={{ padding: '1.25rem' }}>
          <div className="admin-skeleton admin-skeleton-text" style={{ width: '60%', marginBottom: 16 }} />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="admin-skeleton admin-skeleton-text" style={{ width: `${70 + (i % 3) * 10}%`, height: 12, marginBottom: 14 }} />
          ))}
        </aside>
        <div className="admin-main" style={{ padding: '1.75rem 2rem' }}>
          <div className="admin-skeleton admin-skeleton-text" style={{ width: 180, height: 22, marginBottom: 8 }} />
          <div className="admin-skeleton admin-skeleton-text" style={{ width: 260, height: 14, marginBottom: 24 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="admin-skeleton admin-skeleton-card" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="admin-skeleton admin-skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  if (state === 'dbdown') {
    return (
      <div
        className="admin-app"
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
          padding: '2rem',
          flexDirection: 'column',
          gap: '1rem',
          maxWidth: 560,
          margin: '0 auto',
        }}
      >
        <p style={{ color: '#f87171', fontWeight: 700 }}>Baza podataka nije dostupna.</p>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Proverite <code style={{ color: '#cbd5e1' }}>DATABASE_URL</code> u okruženju. Lokalno:{' '}
          <code style={{ color: '#cbd5e1' }}>.env.local</code>, pokrenite Postgres (npr.{' '}
          <code style={{ color: '#cbd5e1' }}>npm run db:up</code>), zatim{' '}
          <code style={{ color: '#cbd5e1' }}>npx prisma migrate deploy</code>.
        </p>
        <Link href="/" style={{ color: '#60a5fa', fontWeight: 600 }}>
          ← Nazad na početnu
        </Link>
      </div>
    );
  }

  if (state === 'network') {
    return (
      <div
        className="admin-app"
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
          padding: '2rem',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <p style={{ color: '#f87171', fontWeight: 700 }}>Mrežna greška</p>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Proverite konekciju i pokušajte ponovo.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 8,
            border: 'none',
            background: '#3b82f6',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Osveži stranicu
        </button>
        <Link href="/" style={{ color: '#60a5fa', fontWeight: 600 }}>
          ← Početna
        </Link>
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div
        className="admin-app"
        style={{
          minHeight: '50vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          color: '#94a3b8',
        }}
      >
        <p>Preusmeravanje na prijavu…</p>
      </div>
    );
  }

  if (state !== 'ok') {
    return (
      <div className="admin-app" style={{ padding: '2rem', color: '#94a3b8' }}>
        <p>Učitavanje…</p>
      </div>
    );
  }

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <span className="admin-sidebar-label">Administracija</span>
          <button
            type="button"
            className="admin-sidebar-toggle"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? 'Zatvori meni' : 'Otvori meni'}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        <nav className={`admin-sidebar-nav${sidebarOpen ? '' : ' collapsed'}`}>
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={active ? 'active' : ''}
                onClick={() => setSidebarOpen(false)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon size={16} strokeWidth={2.2} />
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="admin-sidebar-back">
          <Link
            href="/profil"
            style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}
          >
            Moj profil / Lozinka
          </Link>
          <Link
            href="/"
            style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}
          >
            ← Na sajt
          </Link>
        </div>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
