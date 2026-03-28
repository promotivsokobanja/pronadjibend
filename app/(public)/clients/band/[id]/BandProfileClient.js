'use client';
import { Mail, Phone, MapPin, Calendar, Star, Send, Shield, Music, Video, Info, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import BookingCalendar from '../../../../../components/BookingCalendar';

export default function BandProfileClient({ params }) {
  const [band, setBand] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [busyDates, setBusyDates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [bookingForm, setBookingForm] = useState({
    date: '',
    location: '',
    message: '',
    clientName: '',
    clientEmail: '',
    clientPhone: ''
  });
  const [bookingStatus, setBookingStatus] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bandRes, reviewsRes, calendarRes] = await Promise.all([
          fetch(`/api/bands/show/${params.id}`),
          fetch(`/api/bands/reviews?bandId=${params.id}`),
          fetch(`/api/bands/calendar?bandId=${params.id}`)
        ]);
        
        const [bandData, reviewsData, calendarData] = await Promise.all([
          bandRes.json(),
          reviewsRes.json(),
          calendarRes.json()
        ]);
        
        setBand(bandData);
        setReviews(reviewsData);
        setBusyDates(calendarData.allBusy || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  const handleBooking = async (e) => {
    e.preventDefault();
    setBookingStatus('sending');
    try {
      const resp = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bookingForm, bandId: params.id })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setBookingStatus('success');
      alert('Upit je uspešno poslat! Bend će Vas kontaktirati.');
    } catch (err) {
      setBookingStatus('error');
      alert(err.message);
    }
  };

  if (isLoading) return <div className="loading">Učitavanje profila...</div>;
  if (!band) return <div className="error">Bend nije pronađen.</div>;

  const isDemo = typeof params?.id === 'string' && params.id.startsWith('demo-');

  return (
    <div className="profile-container">
      {isDemo && (
        <div className="container" style={{ paddingTop: '6.5rem' }}>
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              padding: '0.85rem 1.1rem',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}
          >
            Demo profil — primer kako izgleda stranica benda. Prave rezervacije biće dostupne kada se bend registruje na
            platformi.
          </div>
        </div>
      )}
      <section className="profile-hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-content">
              <span className="badge">{band.genre}</span>
              <h1 className="band-name">{band.name}</h1>
              <div className="rating-pill">
                <Star size={16} fill="var(--accent-primary)" />
                <span>{band.rating.toFixed(1)}</span>
                <span className="review-count">({reviews.length} recenzija)</span>
              </div>
              <p className="description">{band.bio || 'Profesionalni muzički sastav za sve vrste proslava.'}</p>
              <div className="meta-info">
                <div className="meta-item"><MapPin size={18} /> {band.location}</div>
                <div className="meta-item"><Info size={18} /> {band.priceRange || 'Dogovor'}</div>
              </div>
            </div>
            
            <div className="booking-card glass-card">
              <h2>Rezerviši Datum</h2>
              <form onSubmit={handleBooking}>
                <div className="calendar-section">
                  <BookingCalendar 
                    bandId={params.id} 
                    busyDates={busyDates} 
                    selectedDate={bookingForm.date}
                    onDateSelect={(date) => setBookingForm({...bookingForm, date})}
                  />
                  {bookingForm.date && (
                    <div className="selected-date-display reveal">
                      <Calendar size={14} /> Izabran datum: <strong>{new Date(bookingForm.date).toLocaleDateString('sr-RS')}</strong>
                    </div>
                  )}
                </div>
                <div className="input-group">
                  <MapPin size={18} />
                  <input type="text" placeholder="Lokacija proslave" required value={bookingForm.location} onChange={e => setBookingForm({...bookingForm, location: e.target.value})} />
                </div>
                <div className="input-group">
                  <User size={18} />
                  <input type="text" placeholder="Vaše Ime" required value={bookingForm.clientName} onChange={e => setBookingForm({...bookingForm, clientName: e.target.value})} />
                </div>
                <div className="input-group">
                  <Mail size={18} />
                  <input type="email" placeholder="Email" required value={bookingForm.clientEmail} onChange={e => setBookingForm({...bookingForm, clientEmail: e.target.value})} />
                </div>
                <button className="btn btn-primary btn-full" type="submit" disabled={bookingStatus === 'sending' || isDemo}>
                  {bookingStatus === 'sending' ? 'Slanje...' : isDemo ? 'Rezervacija na demo profilu nije dostupna' : 'Pošalji Upit'}
                </button>
                {!isDemo && (
                  <p className="secure-badge"><Shield size={14} /> Sigurna rezervacija putem platforme</p>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="media-section container">
        <div className="section-header">
          <h2><Video size={24} /> Video Nastupi</h2>
        </div>
        <div className="video-grid">
          {band.videoUrl ? (
             <iframe 
                width="100%" 
                height="315" 
                src={`https://www.youtube.com/embed/${band.videoUrl.split('v=')[1]}`} 
                title={`Video nastup benda ${band.name}`}
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
          ) : (
            <div className="no-media glass-card">Trenutno nema video zapisa.</div>
          )}
        </div>
      </section>

      <section className="reviews-section container">
        <div className="section-header">
          <h2><Star size={24} /> Iskustva Klijenata</h2>
        </div>
        <div className="reviews-grid">
          {reviews.length > 0 ? reviews.map(rev => (
            <div key={rev.id} className="review-card glass-card">
              <div className="rev-header">
                <strong>{rev.author}</strong>
                <div className="rev-rating">
                  {[...Array(rev.rating)].map((_, i) => <Star key={i} size={14} fill="var(--accent-primary)" />)}
                </div>
              </div>
              <p>{rev.comment}</p>
              <small>{new Date(rev.createdAt).toLocaleDateString('sr-RS')}</small>
            </div>
          )) : (
            <div className="no-media glass-card">Još uvek nema recenzija. Budite prvi!</div>
          )}
        </div>
      </section>

      <style jsx>{`
        .profile-container { 
          padding-bottom: 8rem; 
          background: #f8fafc;
          min-height: 100vh;
        }
        
        .profile-hero { 
          padding: 8rem 0 4rem; 
          background: #ffffff; 
          border-bottom: 1px solid rgba(0,0,0,0.05); 
        }
        
        .hero-grid { 
          display: grid; 
          grid-template-columns: 1.5fr 1fr; 
          gap: 4rem; 
          align-items: start; 
        }
        
        .hero-content .badge { 
          background: #f1f5f9; 
          color: #64748b; 
          padding: 6px 14px; 
          border-radius: 100px; 
          font-weight: 700; 
          font-size: 0.7rem; 
          text-transform: uppercase; 
          letter-spacing: 0.05em; 
          display: inline-block;
          margin-bottom: 1rem;
        }
        
        .band-name { 
          font-size: 3.5rem; 
          margin: 0.5rem 0 1.5rem; 
          font-weight: 800; 
          letter-spacing: -0.04em; 
          color: #0f172a;
        }
        
        .rating-pill { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          font-weight: 700; 
          font-size: 1.1rem; 
          margin-bottom: 2rem; 
          color: #0f172a; 
        }
        
        .review-count { 
          color: #64748b; 
          font-size: 0.9rem; 
          font-weight: 400; 
        }
        
        .description { 
          font-size: 1.15rem; 
          color: #475569; 
          line-height: 1.6; 
          margin-bottom: 2.5rem; 
          max-width: 600px;
        }
        
        .meta-info { 
          display: flex; 
          gap: 2rem; 
        }
        
        .meta-item { 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          font-weight: 600; 
          color: #64748b; 
          font-size: 0.9rem;
        }

        .booking-card { 
          padding: 2.5rem; 
          background: #ffffff;
          border-radius: 24px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 20px 50px rgba(0,0,0,0.04);
          position: sticky; 
          top: 100px; 
        }
        
        .booking-card h2 { 
          margin-bottom: 1.5rem; 
          font-size: 1.25rem; 
          font-weight: 700; 
          color: #0f172a;
        }
        
        .calendar-section { margin-bottom: 1.5rem; }
        
        .selected-date-display { 
          margin-top: 1rem; 
          font-size: 0.85rem; 
          color: #8b5cf6; 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          font-weight: 600; 
          background: rgba(139, 92, 246, 0.05); 
          padding: 10px 14px; 
          border-radius: 12px; 
        }
        
        .input-group { 
          position: relative; 
          display: flex; 
          align-items: center; 
          gap: 0.75rem; 
          padding: 0.85rem 1rem; 
          background: #f8fafc; 
          border: 1px solid #e2e8f0; 
          border-radius: 12px; 
          margin-bottom: 0.75rem; 
          transition: var(--transition);
        }
        
        .input-group:focus-within {
          border-color: #8b5cf6;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
        }

        .input-group svg { color: #94a3b8; }
        .input-group input { 
          background: none; 
          border: none; 
          color: #0f172a; 
          width: 100%; 
          outline: none; 
          font-size: 0.95rem; 
          font-weight: 500;
        }
        
        .input-group input::placeholder { color: #94a3b8; }

        .secure-badge { 
          text-align: center; 
          color: #94a3b8; 
          font-size: 0.75rem; 
          margin-top: 1.5rem; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 6px; 
        }

        .section-header { 
          margin: 6rem 0 2rem; 
          display: flex; 
          align-items: center; 
          gap: 0.75rem; 
        }
        
        .section-header h2 { 
          font-size: 1.75rem; 
          font-weight: 800; 
          color: #0f172a;
          letter-spacing: -0.02em;
        }
        
        .video-grid { 
          border-radius: 24px; 
          overflow: hidden; 
          border: 1px solid #f1f5f9; 
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }
        
        .reviews-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 1.5rem; 
        }
        
        .review-card { 
          padding: 2rem; 
          background: #fff;
          border-radius: 20px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        
        .rev-header { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 1rem; 
          align-items: center;
        }
        
        .rev-header strong { color: #1e293b; font-size: 1rem; }
        .rev-rating { display: flex; gap: 2px; }
        
        .review-card p { 
          color: #475569; 
          line-height: 1.6; 
          margin-bottom: 1.25rem; 
          font-size: 0.95rem;
        }
        
        .review-card small { color: #94a3b8; font-weight: 500; }
        
        @media (max-width: 968px) {
          .hero-grid { grid-template-columns: 1fr; gap: 3rem; }
          .band-name { font-size: 2.75rem; }
          .reviews-grid { grid-template-columns: 1fr; }
          .booking-card { position: static; margin-top: 2rem; }
        }
      `}</style>
    </div>
  );
}
