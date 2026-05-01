'use client';
import Link from 'next/link';
import { Home, Search, Music, User } from 'lucide-react';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Početna' },
  { href: '/clients', icon: Search, label: 'Bendovi' },
  { href: '/muzicari', icon: Music, label: 'Muzičari' },
  { href: '/bands', icon: User, label: 'Portal' },
];

const HIDDEN_PREFIXES = ['/live'];

export default function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

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
