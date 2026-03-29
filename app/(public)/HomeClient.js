'use client';
import { Music, Calendar, Zap, Mail, X, CheckCircle, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { DEFAULT_BAND_COVER, resolveBandCoverImage } from '../../lib/bandImages';
import { nextImageShouldUnoptimize } from '../../lib/remoteImage';
import { pickFeaturedBands } from '../../lib/featuredBands';
import '../../styles/home.css';
import HomeBlogGuideSection from '../../components/home/HomeBlogGuideSection';
import VodicSekcija from '../../components/VodicSekcija';

const scrollFade = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-48px' },
  transition: { duration: 0.48, ease: [0.16, 1, 0.3, 1] },
};

function FeaturedBandCover({ band, priority }) {
  const initial = resolveBandCoverImage(band);
  const [src, setSrc] = useState(initial);

  useEffect(() => {
    setSrc(resolveBandCoverImage(band));
  }, [band?.id, band?.img, band?.name]);

  return (
    <Image
      src={src}
      alt={`${band.name} — bend za svadbe i muzika uživo za restorane, ${band.genre}, ${band.location || 'Srbija'}`}
      fill
      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      sizes="(max-width: 768px) 100vw, 400px"
      priority={priority}
      unoptimized={nextImageShouldUnoptimize(src)}
      onError={() => setSrc(DEFAULT_BAND_COVER)}
    />
  );
}

export default function HomeClient() {
  const [showBooking, setShowBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedBand, setSelectedBand] = useState(null);

  const [featuredBands, setFeaturedBands] = useState([]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const resp = await fetch('/api/bands');
        const data = await resp.json();
        const list = Array.isArray(data) ? data : [];
        setFeaturedBands(pickFeaturedBands(list, 6));
      } catch (err) {
        console.error(err);
      }
    };
    fetchFeatured();
  }, []);

  const handleBook = (band) => {
    setSelectedBand(band);
    setShowBooking(true);
    setBookingStep(1);
  };

  const submitBooking = (e) => {
    e.preventDefault();
    setBookingStep(2);
    console.log(`Sending inquiry to ${selectedBand?.name}`);
  };

  return (
    <div className="home-container perspective-container page-below-fixed-nav">
      <div className="home-blob-layer" aria-hidden>
        <div className="blob" style={{ top: '-10%', left: '-10%', opacity: 0.1 }} />
        <div className="blob-2" style={{ top: '40%', right: '-10%', opacity: 0.08 }} />
        <div
          className="blob float-slow"
          style={{
            bottom: '-10%',
            left: '20%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 75%)',
            animationDelay: '5s',
          }}
        />
      </div>

      <header className="hero">
        <div className="container">
          <h1 className="hero-title reveal">
            Rezerviši <span className="gradient-text">Najbolje Bendove</span>
          </h1>
          <p className="hero-subtitle reveal delay-1">
            Digitalni ekosistem za hotele, restorane i muzičare koji žele vrhunske nastupe.
          </p>

          <div className="hotel-search reveal delay-2">
            <div className="search-field">
              <label>
                <Calendar size={14} /> Datum
              </label>
              <input type="date" />
            </div>
            <div className="search-field">
              <label>
                <Music size={14} /> Žanr
              </label>
              <select>
                <option>Svi žanrovi</option>
                <option>Pop/Rock</option>
                <option>Zabavna</option>
                <option>Narodna</option>
                <option>Jazz</option>
                <option>Acoustic</option>
              </select>
            </div>
            <Link
              href="/clients"
              className="btn btn-primary search-btn"
              title="Otvori pretragu bendova za svadbe, hotele i restorane"
            >
              Pretraži muzičare i bendove
            </Link>
          </div>
          <p className="hero-musician-links reveal delay-3">
            <Link href="/bands/profile">Registruj bend besplatno</Link>
          </p>
        </div>
      </header>

      <motion.section className="featured-bands container" {...scrollFade}>
        <div className="section-title reveal delay-3">
          <h2>
            Preporučujemo <span className="gradient-text">Muzičare</span>
          </h2>
          <p>Baza sertifikovanih bendova spremnih za vaš event.</p>
        </div>

        <div className="band-grid">
          {featuredBands.map((band, idx) => (
            <motion.div
              key={band.id}
              className="glass-card band-card group reveal delay-1"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{
                duration: 0.45,
                delay: Math.min(idx * 0.06, 0.3),
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="band-img">
                <FeaturedBandCover band={band} priority={idx === 0} />
                {band.hasEquipment && (
                  <span className="pa-badge">
                    <Zap size={12} /> Rider OK
                  </span>
                )}
              </div>
              <div className="band-content">
                <div className="band-header-row">
                  <h3>{band.name}</h3>
                  <div className="rating-tag">
                    <Star size={12} fill="currentColor" /> {band.rating}
                  </div>
                </div>
                <p className="text-muted">
                  {band.genre} • {band.location}
                </p>
                <p className="price-info">{band.priceRange || 'Dogovor'}</p>
                <div className="card-actions">
                  <Link
                    href={`/clients/band/${band.id}`}
                    className="btn btn-secondary btn-sm"
                    title={`Pogledaj profil benda ${band.name}`}
                  >
                    Profil i repertoar
                  </Link>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => handleBook(band)}>
                    Zakaži nastup
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section className="experience-gallery container" {...scrollFade}>
        <div className="section-title reveal">
          <h2>
            Experience the <span className="gradient-text">Session</span>
          </h2>
          <p>Atmosfera koja prodaje vaš prostor i privlači klijente.</p>
        </div>
        <div className="gallery-grid">
          <motion.div
            className="img-wrap reveal delay-1"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-32px' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image
              src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800"
              alt="Bend za svadbe i proslave — nastup uživo na bini sa svetlima i publikom"
              width={800}
              height={600}
              sizes="(max-width: 768px) 100vw, 33vw"
              className="gallery-img"
              priority
            />
          </motion.div>
          <motion.div
            className="img-wrap reveal delay-2"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-32px' }}
            transition={{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image
              src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800"
              alt="Muzika uživo za restorane i večernje proslave — atmosfera koncerta"
              width={800}
              height={600}
              sizes="(max-width: 768px) 100vw, 33vw"
              className="gallery-img"
            />
          </motion.div>
          <motion.div
            className="img-wrap reveal delay-3"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-32px' }}
            transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image
              src="https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&q=80&w=800"
              alt="Publika uživa u živom nastupu benda za venčanje i korporativni događaj"
              width={800}
              height={600}
              sizes="(max-width: 768px) 100vw, 33vw"
              className="gallery-img"
            />
          </motion.div>
        </div>
      </motion.section>

      <motion.section className="testimonials container" {...scrollFade}>
        <div className="section-title reveal">
          <h2>
            Reč <span className="gradient-text">Klijenata</span>
          </h2>
          <p>Šta kažu menadžeri hotela i restorana širom regiona.</p>
        </div>
        <div className="testimonial-grid">
          <motion.div
            className="glass-card reveal delay-1"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-32px' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="quote">
              {'\u201E'}
              Od kada koristimo Pronađi Bend, buking muzike za naš hotel je postao 10x lakši i profesionalniji.
              {'\u201C'}
            </p>
            <div className="author">- Marko M. (Hotel Manager)</div>
          </motion.div>
          <motion.div
            className="glass-card reveal delay-2"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-32px' }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="quote">
              {'\u201E'}
              Sistem olakšava komunikaciju, a gosti obožavaju inovativni Live Request funkciju tokom večeri.
              {'\u201C'}
            </p>
            <div className="author">- Jelena S. (Event Planner)</div>
          </motion.div>
        </div>
      </motion.section>

      <HomeBlogGuideSection />

      <motion.section className="pricing container" {...scrollFade}>
        <div className="section-title reveal">
          <h2>
            Transparentni <span className="gradient-text">Paketi</span>
          </h2>
          <p>Odaberite plan koji odgovara vašim poslovnim potrebama.</p>
        </div>
        <div className="pricing-grid">
          <motion.div
            className="glass-card pricing-card reveal delay-1 card-3d-wrap"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-32px' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="card-3d-content">
              <h3>Basic</h3>
              <div className="price">Besplatno</div>
              <ul className="price-features">
                <li>
                  <CheckCircle size={16} color="var(--accent-secondary)" /> Pristup bazi bendova
                </li>
                <li>
                  <CheckCircle size={16} color="var(--accent-secondary)" /> Direktni upiti i booking
                </li>
              </ul>
              <Link href="/login?plan=basic" className="btn btn-secondary btn-full">
                Započni besplatno
              </Link>
            </div>
          </motion.div>
          <motion.div
            className="glass-card pricing-card featured-price reveal delay-2"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-32px' }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="badge">Preporučeno</div>
            <h3>Premium Venue</h3>
            <div className="price">
              49€<span className="period">/mes</span>
            </div>
            <ul className="price-features">
              <li>
                <CheckCircle size={16} color="var(--accent-primary)" /> Live Request Sistem
              </li>
              <li>
                <CheckCircle size={16} color="var(--accent-primary)" /> Prioritetni Booking
              </li>
              <li>
                <CheckCircle size={16} color="var(--accent-primary)" /> Promocija na platformi
              </li>
            </ul>
            <Link href="/premium/checkout" className="btn btn-primary btn-full">
              Odaberi Premium plan
            </Link>
          </motion.div>
        </div>
      </motion.section>

      <VodicSekcija />

      {showBooking && (
        <div className="modal-overlay">
          <div className="modal glass-card">
            <button type="button" className="close-btn" onClick={() => setShowBooking(false)} aria-label="Zatvori prozor">
              <X size={20} />
            </button>

            {bookingStep === 1 ? (
              <form onSubmit={submitBooking}>
                <h3 className="modal-title">
                  Upit za nastup: <span className="gradient-text">{selectedBand?.name}</span>
                </h3>
                <p className="text-muted">Pošaljite direktan upit bendu. Odgovor stiže na vaš email.</p>

                <div className="form-group">
                  <label htmlFor="booking-name">Vaše Ime / Hotel</label>
                  <input id="booking-name" type="text" placeholder="npr. Hotel Moskva" required />
                </div>
                <div className="form-group">
                  <label htmlFor="booking-email">Email adresa</label>
                  <input id="booking-email" type="email" placeholder="manager@hotel.com" required />
                </div>
                <div className="form-group">
                  <label htmlFor="booking-event">Tip događaja</label>
                  <select id="booking-event">
                    <option>Svadba / Proslava</option>
                    <option>Korporativni event</option>
                    <option>Background muzika (Restoran)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="booking-note">Napomena</label>
                  <textarea id="booking-note" placeholder="Navedite detalje nastupa..." />
                </div>

                <button type="submit" className="btn btn-primary btn-full">
                  <Mail size={18} style={{ marginRight: '8px' }} /> Pošalji upit bendu
                </button>
              </form>
            ) : (
              <div className="success-message">
                <CheckCircle size={64} color="var(--accent-primary)" />
                <h2>Upit poslat</h2>
                <p>
                  Bend {selectedBand?.name} je primio vaš zahtev. Bićete kontaktirani putem emaila.
                </p>
                <button type="button" className="btn btn-primary" onClick={() => setShowBooking(false)}>
                  Zatvori
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
