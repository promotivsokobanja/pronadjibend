'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Instagram, Facebook } from 'lucide-react';

const DEFAULTS = {
  email: 'office@pronadjibend.com',
  phone: '+381 64 339 2339',
  location: 'Sokobanja, Srbija',
  instagram: 'https://instagram.com/pronadjiband',
  facebook: '',
};

export default function Footer() {
  const [contact, setContact] = useState(DEFAULTS);

  useEffect(() => {
    fetch('/api/site/contact')
      .then((r) => r.ok ? r.json() : DEFAULTS)
      .then((data) => setContact({ ...DEFAULTS, ...data }))
      .catch(() => {});
  }, []);

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
              {contact.instagram && <a href={contact.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={20} /></a>}
              {contact.facebook && <a href={contact.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={20} /></a>}
            </div>
          </div>

          <div className="footer-links">
            <h4>Platforma</h4>
            <ul>
              <li><Link href="/clients">Pretraži Bendove</Link></li>
              <li><Link href="/muzicari">Pretraži Muzičare</Link></li>
              <li><Link href="/bands">Za Muzičare</Link></li>
              <li>
                <a href="/marketing/poster-A4.png" download="PronadjiBend-poster-A4.png">
                  Poster za štampu (A4)
                </a>
              </li>
              <li><Link href="/about">O Nama</Link></li>
              <li><Link href="/faq">Česta Pitanja</Link></li>
            </ul>
          </div>

          <div className="footer-contact">
            <h4>Kontakt</h4>
            <ul>
              {contact.email && <li><Mail size={16} /> {contact.email}</li>}
              {contact.phone && <li><Phone size={16} /> {contact.phone}</li>}
              {contact.location && <li><MapPin size={16} /> {contact.location}</li>}
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
