'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin, Instagram, Facebook, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="logo-group">
              <div className="logo-wrapper">
                <Image
                  src="/images/logo.png"
                  alt="Logo"
                  className="logo-img"
                  width={38}
                  height={38}
                  sizes="38px"
                  quality={70}
                />
              </div>
              <span className="logo-text">Pronadji<span className="accent">Bend</span></span>
            </Link>
            <p className="brand-bio">
              Vodeća digitalna platforma za muzičke nastupe u regionu. 
              Povezujemo najbolje bendove sa klijentima kroz moderan i inovativan sistem.
            </p>
            <div className="social-links">
              <a href="https://instagram.com/pronadjiband" target="_blank" rel="noopener noreferrer"><Instagram size={20} /></a>
              <a href="/" aria-label="Facebook"><Facebook size={20} /></a>
              <a href="#"><Twitter size={20} /></a>
            </div>
          </div>

          <div className="footer-links">
            <h4>Platforma</h4>
            <ul>
              <li><Link href="/clients?pretraga=1">Pretraži Bendove</Link></li>
              <li><Link href="/bands">Za Muzičare</Link></li>
              <li><Link href="/about">O Nama</Link></li>
              <li><Link href="/faq">Česta Pitanja</Link></li>
            </ul>
          </div>

          <div className="footer-contact">
            <h4>Kontakt</h4>
            <ul>
              <li><Mail size={16} /> office@pronadjibend.rs</li>
              <li><Phone size={16} /> +381 64 339 2339</li>
              <li><MapPin size={16} /> Sokobanja, Srbija</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            &copy; 2026 Pronadji Bend. Sva prava zadržana.
            <span className="legal">
              <Link href="/privatnost">Privatnost</Link>
              <span> • </span>
              <Link href="/uslovi-koriscenja">Uslovi korišćenja</Link>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
