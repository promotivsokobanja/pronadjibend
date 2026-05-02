'use client';
import Link from 'next/link';
import { Home, Search, Music, User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Početna' },
  { href: '/clients', icon: Search, label: 'Bendovi' },
  { href: '/muzicari', icon: Music, label: 'Muzičari' },
  { href: '/bands', icon: User, label: 'Portal' },
];

const HIDDEN_PREFIXES = ['/live', '/bands/live', '/muzicari/profil/live'];

export default function BottomNav() {
  const pathname = usePathname();
  const isHidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (isHidden) {
      document.body.classList.remove('bottom-nav-visible');
    } else {
      document.body.classList.add('bottom-nav-visible');
    }
    return () => document.body.classList.remove('bottom-nav-visible');
  }, [isHidden]);

  if (isHidden) return null;

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="bottom-nav" aria-label="Mobilna navigacija">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={`bottom-nav-item${isActive(href) ? ' active' : ''}`}
          prefetch={false}
        >
          <Icon size={20} strokeWidth={isActive(href) ? 2.5 : 1.8} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
