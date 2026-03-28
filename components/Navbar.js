'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { adminFetch } from '../lib/adminFetch';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

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
    let cancelled = false;
    (async () => {
      try {
        const r = await adminFetch('/api/auth/me');
        const data = await r.json().catch(() => ({}));
        if (!cancelled && r.ok && data.user?.role === 'ADMIN') {
          setIsAdmin(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
          <Link href="/clients" className={`nav-link ${isActive('/clients') ? 'active' : ''}`}>Pretraži Bendove</Link>
          <Link href="/bands" className={`nav-link ${isActive('/bands') ? 'active' : ''}`}>Portal za Muzičare</Link>
          <Link href="/about" className={`nav-link ${isActive('/about') ? 'active' : ''}`}>O nama</Link>
          {isAdmin && (
            <Link href="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
              Admin
            </Link>
          )}
          <Link href="/login" className="btn-prijava">PRIJAVA</Link>
        </div>

        {/* Mobile toggle */}
        <button className="mobile-toggle" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="mobile-menu">
          <Link href="/clients" className={isActive('/clients') ? 'active-mobile' : ''} onClick={() => setIsOpen(false)}>Pretraži Bendove</Link>
          <Link href="/bands" className={isActive('/bands') ? 'active-mobile' : ''} onClick={() => setIsOpen(false)}>Portal za Muzičare</Link>
          <Link href="/about" className={isActive('/about') ? 'active-mobile' : ''} onClick={() => setIsOpen(false)}>O nama</Link>
          {isAdmin && (
            <Link href="/admin" className={isActive('/admin') ? 'active-mobile' : ''} onClick={() => setIsOpen(false)}>
              Admin
            </Link>
          )}
          <Link href="/login" className="btn-prijava-mobile" onClick={() => setIsOpen(false)}>Prijava</Link>
        </div>
      )}
    </nav>
  );
}
