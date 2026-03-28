'use client';
import { Music, Search, Smartphone, Calendar, Zap, Mail, X, CheckCircle, Star } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { resolveBandCoverImage } from '../../lib/bandImages'
import '../../styles/home.css'

export default function HomeClient() {
  const [showBooking, setShowBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedBand, setSelectedBand] = useState(null);

  const [featuredBands, setFeaturedBands] = useState([]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const resp = await fetch('/api/bands', { cache: 'no-store' });
        const data = await resp.json();
        const list = Array.isArray(data) ? data : [];
        setFeaturedBands(list.slice(0, 6));
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
    console.log(`Sending inquiry to ${selectedBand.name}`);
  };

  return (
    <div className="home-container perspective-container">
      <div className="blob" style={{ top: '-10%', left: '-10%', opacity: 0.1 }}></div>
      <div className="blob-2" style={{ top: '40%', right: '-10%', opacity: 0.08 }}></div>
      <div className="blob float-slow" style={{ bottom: '-10%', left: '20%', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 75%)', animationDelay: '5s' }}></div>


      <header className="hero">
        <div className="container">
          <h1 className="hero-title reveal">Rezerviši <span className="gradient-text">Najbolje Bendove</span></h1>
          <p className="hero-subtitle reveal delay-1">Digitalni ekosistem za hotele, restorane i muzičare koji žele vrhunske nastupe.</p>
          
          <div className="hotel-search reveal delay-2">
            <div className="search-field">
              <label><Calendar size={14}/> Datum</label>
              <input type="date" />
            </div>
            <div className="search-field">
              <label><Music size={14}/> Žanr</label>
              <select>
                <option>Svi žanrovi</option>
                <option>Pop/Rock</option>
                <option>Zabavna</option>
                <option>Narodna</option>
                <option>Jazz</option>
                <option>Acoustic</option>
              </select>

            </div>
            <Link href="/clients" className="btn btn-primary search-btn">Pretraži Muzičare</Link>
          </div>

        </div>
      </header>
      
      <section className="featured-bands container">
        <div className="section-title reveal delay-3">
          <h2>Preporučeni <span className="gradient-text">Muzičari</span></h2>
          <p>Baza sertifikovanih bendova spremnih za vaš event.</p>
        </div>
        
        <div className="band-grid">
          {featuredBands.map((band, idx) => (
            <div key={band.id} className={`glass-card band-card reveal delay-${idx+1}`}>
              <div className="band-img" style={{backgroundImage: `url(${resolveBandCoverImage(band)})`}}>
                {band.hasEquipment && <span className="pa-badge"><Zap size={12}/> Rider OK</span>}
              </div>
              <div className="band-content">
                <div className="band-header-row">
                  <h3>{band.name}</h3>
                  <div className="rating-tag"><Star size={12} fill="currentColor" /> {band.rating}</div>
                </div>
                <p className="text-muted">{band.genre} • {band.location}</p>
                <p className="price-info">{band.priceRange || 'Dogovor'}</p>
                <div className="card-actions">
                  <Link href={`/clients/band/${band.id}`} className="btn btn-secondary btn-sm">Profil</Link>
                  <button className="btn btn-primary btn-sm">Zakaži</button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </section>

      <section className="experience-gallery container">
        <div className="section-title reveal">
          <h2>Experience the <span className="gradient-text">Session</span></h2>
          <p>Atmosfera koja prodaje vaš prostor i privlači klijente.</p>
        </div>
        <div className="gallery-grid">
          <div className="img-wrap reveal delay-1"><img src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=600" alt="Bend nastupa uživo na bini sa svetlima i publikom"/></div>
          <div className="img-wrap reveal delay-2"><img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=600" alt="Atmosfera na koncertu sa konfetama i rasveto"/></div>
          <div className="img-wrap reveal delay-3"><img src="https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&q=80&w=600" alt="Publika uživa u živom nastupu benda"/></div>
        </div>
      </section>

      <section className="testimonials container">
        <div className="section-title reveal">
          <h2>Reč <span className="gradient-text">Klijenata</span></h2>
          <p>Šta kažu menadžeri hotela i restorana širom regiona.</p>
        </div>
        <div className="testimonial-grid">
          <div className="glass-card reveal delay-1">
            <p className="quote">{'\u201E'}Od kada koristimo Pronađi Bend, buking muzike za naš hotel je postao 10x lakši i profesionalniji.{'\u201C'}</p>
            <div className="author">- Marko M. (Hotel Manager)</div>
          </div>
          <div className="glass-card reveal delay-2">
            <p className="quote">{'\u201E'}Sistem olakšava komunikaciju, a gosti obožavaju inovativni Live Request funkciju tokom večeri.{'\u201C'}</p>
            <div className="author">- Jelena S. (Event Planner)</div>
          </div>
        </div>
      </section>

      <section className="pricing container">
        <div className="section-title reveal">
          <h2>Transparentni <span className="gradient-text">Paketi</span></h2>
          <p>Odaberite plan koji odgovara vašim poslovnim potrebama.</p>
        </div>
        <div className="pricing-grid">
          <div className="glass-card pricing-card reveal delay-1 card-3d-wrap">
            <div className="card-3d-content">
              <h3>Basic</h3>
              <div className="price">Besplatno</div>
              <ul className="price-features">
                <li><CheckCircle size={16} color="var(--accent-secondary)"/> Pristup bazi bendova</li>
                <li><CheckCircle size={16} color="var(--accent-secondary)"/> Direktni upiti i booking</li>
              </ul>
              <Link href="/login?plan=basic" className="btn btn-secondary btn-full">Započni</Link>
            </div>
          </div>
          <div className="glass-card pricing-card featured-price reveal delay-2">
            <div className="badge">Preporučeno</div>
            <h3>Premium Venue</h3>
            <div className="price">49€<span className="period">/mes</span></div>
            <ul className="price-features">
              <li><CheckCircle size={16} color="var(--accent-primary)"/> Live Request Sistem</li>
              <li><CheckCircle size={16} color="var(--accent-primary)"/> Prioritetni Booking</li>
              <li><CheckCircle size={16} color="var(--accent-primary)"/> Promocija na platformi</li>
            </ul>
            <Link href="/premium/checkout" className="btn btn-primary btn-full">Odaberi Premium</Link>
          </div>

        </div>
      </section>

      {showBooking && (
        <div className="modal-overlay">
          <div className="modal glass-card">
            <button className="close-btn" onClick={() => setShowBooking(false)}><X size={20}/></button>
            
            {bookingStep === 1 ? (
              <form onSubmit={submitBooking}>
                <h3 className="modal-title">Upit za nastup: <span className="gradient-text">{selectedBand?.name}</span></h3>
                <p className="text-muted">Pošaljite direktan upit bendu. Odgovor stiže na vaš email.</p>
                
                <div className="form-group">
                  <label>Vaše Ime / Hotel</label>
                  <input type="text" placeholder="npr. Hotel Moskva" required />
                </div>
                <div className="form-group">
                  <label>Email adresa</label>
                  <input type="email" placeholder="manager@hotel.com" required />
                </div>
                <div className="form-group">
                  <label>Tip događaja</label>
                  <select>
                    <option>Svadba / Proslava</option>
                    <option>Korporativni event</option>
                    <option>Background muzika (Restoran)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Napomena</label>
                  <textarea placeholder="Navedite detalje nastupa..."></textarea>
                </div>
                
                <button type="submit" className="btn btn-primary btn-full">
                  <Mail size={18} style={{marginRight: '8px'}}/> Pošalji Upit Bendu
                </button>
              </form>
            ) : (
              <div className="success-message">
                <CheckCircle size={64} color="var(--accent-primary)" />
                <h2>Upit Poslat!</h2>
                <p>Bend {selectedBand?.name} je primio vaš zahtev. Bićete kontaktirani putem emaila.</p>
                <button className="btn btn-primary" onClick={() => setShowBooking(false)}>Zatvori</button>
              </div>

            )}
          </div>
        </div>
      )}
    </div>
  )
}
