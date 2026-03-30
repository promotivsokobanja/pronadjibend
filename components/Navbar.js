'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { adminFetch } from '../lib/adminFetch';
import { useClientSearch } from './clients/ClientSearchContext';
import ClientsNavSearchPanel from './clients/ClientsNavSearchPanel';

const NAV_SESSION_CACHE_KEY = 'pb_nav_session_v1';
const NAV_SESSION_CACHE_TTL_MS = 60 * 1000;

function clearCachedSession() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(NAV_SESSION_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

async function logoutAndRedirect() {
  clearCachedSession();
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } catch {
    /* ignore */
  }
  const home = encodeURIComponent('/');
  window.location.href = `/api/auth/signout?callbackUrl=${home}`;
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const pathname = usePathname();
  const { setIsNavSearchOpen } = useClientSearch();

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (pathname !== '/clients') setIsNavSearchOpen(false);
    setIsOpen(false);
  }, [pathname, setIsNavSearchOpen]);

  useEffect(() => {
    let cancelled = false;

    const readCachedSession = () => {
      if (typeof window === 'undefined') return null;
      try {
        const raw = sessionStorage.getItem(NAV_SESSION_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (Date.now() - (parsed.ts || 0) > NAV_SESSION_CACHE_TTL_MS) return null;
        return parsed.user || null;
      } catch {
        return null;
      }
    };

    const writeCachedSession = (user) => {
      if (typeof window === 'undefined') return;
      try {
        sessionStorage.setItem(
          NAV_SESSION_CACHE_KEY,
          JSON.stringify({ ts: Date.now(), user: user || null })
        );
      } catch {
        /* ignore */
      }
    };

    const cachedUser = readCachedSession();
    if (cachedUser) {
      setSessionUser(cachedUser);
      setIsAdmin(cachedUser?.role === 'ADMIN');
    }

    (async () => {
      try {
        const r = await adminFetch('/api/auth/me', { cache: 'no-store' });
        const data = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok || !data?.user) {
          setSessionUser(null);
          setIsAdmin(false);
          clearCachedSession();
          return;
        }
        setSessionUser(data.user || null);
        setIsAdmin(data.user?.role === 'ADMIN');
        writeCachedSession(data.user || null);
      } catch {
        if (cancelled) return;
        setSessionUser(null);
        setIsAdmin(false);
        clearCachedSession();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <nav className="navbar">
      <div className="container nav-content">
        <Link href="/" className="logo-link">
          <div className="logo-group">
            <div className="logo-wrapper">
              <Image
                src="/images/logo.png"
                alt="Logo"
                className="logo-img"
                width={44}
                height={44}
                sizes="44px"
                priority
                quality={70}
              />
            </div>
            <span className="logo-text">Pronadji<span className="accent">Bend</span></span>
          </div>
        </Link>

        {/* Desktop Menu */}
        <div className="nav-links desktop-only">
          <Link href="/clients" prefetch={false} className={`nav-link ${isActive('/clients') ? 'active' : ''}`}>
            Pretraži Bendove
          </Link>
          <Link href="/bands" prefetch={false} className={`nav-link ${isActive('/bands') ? 'active' : ''}`}>Portal za Muzičare</Link>
          <Link href="/about" prefetch={false} className={`nav-link ${isActive('/about') ? 'active' : ''}`}>O nama</Link>
          <Link href="/#vodic" prefetch={false} className="nav-link">
            Vodič
          </Link>
          {isAdmin && (
            <Link href="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
              Admin
            </Link>
          )}
          {sessionUser ? (
            <button type="button" className="btn-prijava" onClick={() => logoutAndRedirect()}>
              Odjava
            </button>
          ) : (
            <Link href="/login" className="btn-prijava">PRIJAVA</Link>
          )}
        </div>

        <button className="mobile-toggle" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="mobile-menu">
          <Link
            href="/clients"
            className={isActive('/clients') ? 'active-mobile' : ''}
            onClick={() => setIsOpen(false)}
          >
            Pretraži Bendove
          </Link>
          <Link href="/bands" className={isActive('/bands') ? 'active-mobile' : ''} onClick={() => setIsOpen(false)}>Portal za Muzičare</Link>
          <Link href="/about" className={isActive('/about') ? 'active-mobile' : ''} onClick={() => setIsOpen(false)}>O nama</Link>
          <Link href="/#vodic" onClick={() => setIsOpen(false)}>
            Vodič
          </Link>
          {isAdmin && (
            <Link href="/admin" className={isActive('/admin') ? 'active-mobile' : ''} onClick={() => setIsOpen(false)}>
              Admin
            </Link>
          )}
          {sessionUser ? (
            <button
              type="button"
              className="btn-prijava-mobile"
              onClick={() => {
                setIsOpen(false);
                logoutAndRedirect();
              }}
            >
              Odjava
            </button>
          ) : (
            <Link href="/login" className="btn-prijava-mobile" onClick={() => setIsOpen(false)}>Prijava</Link>
          )}
        </div>
      )}

      {pathname === '/clients' && <ClientsNavSearchPanel />}
    </nav>
  );
}
