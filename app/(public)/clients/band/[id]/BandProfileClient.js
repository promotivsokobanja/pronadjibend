'use client';
import { Mail, Phone, MapPin, Calendar, Star, Send, Shield, Music, Video, Info, User, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import BookingCalendar from '../../../../../components/BookingCalendar';

const BOOKING_MESSAGE_MAX = 500;
const MAX_BOOKING_DATES = 14;
const REVIEW_COMMENT_MAX = 250;

function formatDateKeySr(ymd) {
  const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(ymd);
  const [, y, mo, d] = m;
  return `${parseInt(d, 10)}. ${parseInt(mo, 10)}. ${y}.`;
}

function extractVideoEmbed(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtu.be')) {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }

    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      const id = parsed.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      const embedPath = parsed.pathname.split('/embed/')[1];
      return embedPath ? `https://www.youtube.com/embed/${embedPath}` : '';
    }

    if (host.includes('vimeo.com')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      const id = parts[parts.length - 1];
      return /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : '';
    }

    return '';
  } catch {
    return '';
  }
}

function isCloudinaryVideo(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().includes('res.cloudinary.com');
  } catch {
    return false;
  }
}

export default function BandProfileClient({ params }) {
  const [band, setBand] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [busyDates, setBusyDates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [bookingForm, setBookingForm] = useState({
    dates: [],
    location: '',
    message: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
  });
  const [bookingStatus, setBookingStatus] = useState('');
  const [reviewForm, setReviewForm] = useState({ author: '', rating: 5, comment: '' });
  const [reviewStatus, setReviewStatus] = useState('');

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

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (reviewForm.comment.length > REVIEW_COMMENT_MAX) {
      alert(`Poruka može imati najviše ${REVIEW_COMMENT_MAX} karaktera.`);
      return;
    }
    setReviewStatus('sending');
    try {
      const resp = await fetch('/api/bands/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandId: params.id,
          author: reviewForm.author,
          rating: reviewForm.rating,
          comment: reviewForm.comment.trim() || null,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Greška');
      setReviews((prev) => [data.review, ...prev]);
      setBand((prev) => (prev && typeof data.rating === 'number' ? { ...prev, rating: data.rating } : prev));
      setReviewForm({ author: '', rating: 5, comment: '' });
      setReviewStatus('success');
      setTimeout(() => setReviewStatus(''), 5000);
    } catch (err) {
      alert(err.message || 'Slanje recenzije nije uspelo.');
      setReviewStatus('');
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!bookingForm.dates?.length) {
      alert('Molimo izaberite bar jedan datum u kalendaru.');
      return;
    }
    if (bookingForm.message.length > BOOKING_MESSAGE_MAX) {
      alert(`Poruka može imati najviše ${BOOKING_MESSAGE_MAX} karaktera.`);
      return;
    }
    setBookingStatus('sending');
    try {
      const resp = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandId: params.id,
          dates: bookingForm.dates,
          location: bookingForm.location,
          message: bookingForm.message,
          clientName: bookingForm.clientName,
          clientEmail: bookingForm.clientEmail,
          clientPhone: bookingForm.clientPhone,
        }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setBookingStatus('success');
      setBookingForm({
        dates: [],
        location: '',
        message: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
      });
      alert('Upit je uspešno poslat! Bend će Vas kontaktirati.');
    } catch (err) {
      setBookingStatus('error');
      alert(err.message);
    }
  };

  if (isLoading) return <div className="loading">Učitavanje profila...</div>;
  if (!band) return <div className="error">Bend nije pronađen.</div>;

  const isDemo = typeof params?.id === 'string' && params.id.startsWith('demo-');
  const embeddedVideo = extractVideoEmbed(band.videoUrl);
  const cloudinaryVideo = !embeddedVideo && isCloudinaryVideo(band.videoUrl) ? band.videoUrl : '';
  const hasDirectVideoLink = Boolean(band.videoUrl);

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
            <div className="hero-main">
              {band.img ? (
                <div className="hero-media">
                  <img src={band.img} alt={`Fotografija benda ${band.name}`} loading="lazy" />
                </div>
              ) : null}
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
            </div>
            
            <div className="booking-card glass-card">
              <h2>Rezerviši termine</h2>
              <form onSubmit={handleBooking}>
                <div className="calendar-section">
                  <BookingCalendar
                    bandId={params.id}
                    busyDates={busyDates}
                    multiSelect
                    selectedDates={bookingForm.dates}
                    onDatesChange={(dates) => setBookingForm((prev) => ({ ...prev, dates }))}
                  />
                  <p className="calendar-hint">
                    <strong>Zauzeti</strong> dani su sivi i precrtani — <strong>ne mogu</strong> se izabrati (bend ih je
                    blokirao ili su već potvrđena druga rezervacija). Izaberite jedan ili više <strong>slobodnih</strong>{' '}
                    dana (do {MAX_BOOKING_DATES}); klik na već izabrani dan ga uklanja.
                  </p>
                  {bookingForm.dates.length > 0 && (
                    <div className="selected-date-display reveal">
                      <Calendar size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div className="selected-dates-body">
                        <span className="selected-dates-label">
                          Izabrani datumi ({bookingForm.dates.length}):
                        </span>
                        <ul className="selected-dates-ul">
                          {[...bookingForm.dates].sort().map((d) => (
                            <li key={d}>{formatDateKeySr(d)}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                <div className="input-group">
                  <MapPin size={18} />
                  <input type="text" placeholder="Lokacija proslave" required value={bookingForm.location} onChange={e => setBookingForm({...bookingForm, location: e.target.value})} />
                </div>
                <div className="input-group input-group-textarea">
                  <MessageSquare size={18} className="textarea-icon" />
                  <div className="textarea-wrap">
                    <textarea
                      id="booking-message"
                      rows={3}
                      maxLength={BOOKING_MESSAGE_MAX}
                      placeholder="Kratka poruka bendu (opciono, npr. vrsta proslave, broj gostiju…)"
                      value={bookingForm.message}
                      aria-label="Poruka za bend"
                      onChange={(e) =>
                        setBookingForm((prev) => ({ ...prev, message: e.target.value }))
                      }
                    />
                    <span className="char-count">
                      {bookingForm.message.length} / {BOOKING_MESSAGE_MAX}
                    </span>
                  </div>
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
          {embeddedVideo ? (
            <>
              <iframe
                width="100%"
                height="315"
                src={embeddedVideo}
                title={`Video nastup benda ${band.name}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              {hasDirectVideoLink ? (
                <a className="video-fallback-link" href={band.videoUrl} target="_blank" rel="noreferrer">
                  Ako se video ne prikazuje, otvori u novom tabu
                </a>
              ) : null}
            </>
          ) : cloudinaryVideo ? (
            <video className="cloudinary-video" controls preload="metadata" src={cloudinaryVideo}>
              Vaš browser ne podržava video tag.
            </video>
          ) : hasDirectVideoLink ? (
            <div className="no-media glass-card">
              Video ne podržava ugrađeni prikaz.
              <a className="video-fallback-link" href={band.videoUrl} target="_blank" rel="noreferrer">
                Otvori video direktno
              </a>
            </div>
          ) : (
            <div className="no-media glass-card">Trenutno nema video zapisa.</div>
          )}
        </div>
      </section>

      <section className="reviews-section container">
        <div className="section-header">
          <h2><Star size={24} /> Iskustva Klijenata</h2>
        </div>

        {!isDemo && (
          <form className="review-compose glass-card" onSubmit={handleReviewSubmit}>
            <h3 className="review-compose-title">Ostavite recenziju</h3>
            <p className="review-compose-intro">
              Vaša ocena i kratka poruka (do {REVIEW_COMMENT_MAX} karaktera) pomažu drugim klijentima da izaberu bend.
            </p>
            <div className="review-field">
              <label htmlFor="review-author">Vaše ime ili inicijali</label>
              <input
                id="review-author"
                type="text"
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                placeholder="npr. Marko P."
                value={reviewForm.author}
                onChange={(e) => setReviewForm((p) => ({ ...p, author: e.target.value }))}
              />
            </div>
            <div className="review-field">
              <span className="review-label" id="review-rating-label">
                Ocena
              </span>
              <div className="star-picker" role="group" aria-labelledby="review-rating-label">
                {[1, 2, 3, 4, 5].map((n) => {
                  const on = n <= reviewForm.rating;
                  return (
                    <button
                      key={n}
                      type="button"
                      className="star-picker-btn"
                      aria-label={`${n} od 5 zvezdica`}
                      aria-pressed={on}
                      onClick={() => setReviewForm((p) => ({ ...p, rating: n }))}
                    >
                      <Star
                        size={26}
                        fill={on ? 'var(--accent-primary, #8b5cf6)' : 'none'}
                        color={on ? 'var(--accent-primary, #8b5cf6)' : '#cbd5e1'}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="review-field">
              <label htmlFor="review-comment">Poruka (opciono)</label>
              <textarea
                id="review-comment"
                rows={3}
                maxLength={REVIEW_COMMENT_MAX}
                placeholder="Kratko iskustvo sa bendom…"
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((p) => ({ ...p, comment: e.target.value }))}
              />
              <span className="review-char-count">
                {reviewForm.comment.length} / {REVIEW_COMMENT_MAX}
              </span>
            </div>
            <button
              type="submit"
              className="btn btn-primary review-submit"
              disabled={reviewStatus === 'sending'}
            >
              {reviewStatus === 'sending' ? 'Slanje…' : 'Pošalji recenziju'}
            </button>
            {reviewStatus === 'success' && (
              <p className="review-feedback review-feedback-success" role="status">
                Hvala — vaša recenzija je sačuvana.
              </p>
            )}
          </form>
        )}

        <div className="reviews-grid">
          {reviews.length > 0 ? (
            reviews.map((rev) => (
              <div key={rev.id} className="review-card glass-card">
                <div className="rev-header">
                  <strong>{rev.author}</strong>
                  <div className="rev-rating">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} size={14} fill="var(--accent-primary)" />
                    ))}
                  </div>
                </div>
                {rev.comment ? <p>{rev.comment}</p> : null}
                <small>{new Date(rev.createdAt).toLocaleDateString('sr-RS')}</small>
              </div>
            ))
          ) : (
            <div className="no-media glass-card reviews-empty">
              {isDemo
                ? 'Na demo profilu recenzije nisu dostupne.'
                : 'Još uvek nema recenzija. Budite prvi ispod u formi.'}
            </div>
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

        .hero-main {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .hero-media {
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          background: #0f172a;
          box-shadow: 0 25px 60px rgba(15, 23, 42, 0.15);
        }

        .hero-media img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: cover;
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
          white-space: pre-line;
          overflow-wrap: anywhere;
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
        
        .calendar-hint {
          margin: 0.65rem 0 0;
          font-size: 0.78rem;
          color: #94a3b8;
          line-height: 1.4;
          font-weight: 500;
        }
        
        .selected-date-display { 
          margin-top: 1rem; 
          font-size: 0.85rem; 
          color: #8b5cf6; 
          display: flex; 
          align-items: flex-start; 
          gap: 10px; 
          font-weight: 600; 
          background: rgba(139, 92, 246, 0.05); 
          padding: 10px 14px; 
          border-radius: 12px; 
        }
        .selected-dates-body { flex: 1; min-width: 0; }
        .selected-dates-label { display: block; margin-bottom: 0.35rem; font-size: 0.8rem; }
        .selected-dates-ul {
          margin: 0;
          padding-left: 1.1rem;
          color: #5b21b6;
          font-weight: 700;
          line-height: 1.45;
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

        .input-group-textarea {
          align-items: flex-start;
        }
        .textarea-icon {
          flex-shrink: 0;
          margin-top: 0.35rem;
          color: #94a3b8;
        }
        .textarea-wrap {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .input-group textarea {
          background: none;
          border: none;
          color: #0f172a;
          width: 100%;
          outline: none;
          font-size: 0.95rem;
          font-weight: 500;
          font-family: inherit;
          resize: vertical;
          min-height: 4.25rem;
          line-height: 1.45;
        }
        .input-group textarea::placeholder {
          color: #94a3b8;
        }
        .char-count {
          font-size: 0.72rem;
          color: #94a3b8;
          text-align: right;
          font-weight: 600;
        }

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

        .review-compose {
          padding: 1.75rem 2rem;
          margin-bottom: 2rem;
          border-radius: 20px;
          border: 1px solid #f1f5f9;
          background: #fff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
        }
        .review-compose-title {
          margin: 0 0 0.5rem;
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
        }
        .review-compose-intro {
          margin: 0 0 1.25rem;
          font-size: 0.85rem;
          color: #64748b;
          line-height: 1.45;
        }
        .review-field {
          margin-bottom: 1.1rem;
        }
        .review-field label,
        .review-label {
          display: block;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #64748b;
          margin-bottom: 0.45rem;
        }
        .review-field input,
        .review-field textarea {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 0.75rem 0.9rem;
          font-size: 0.95rem;
          color: #0f172a;
          outline: none;
          font-family: inherit;
          box-sizing: border-box;
        }
        .review-field textarea {
          resize: vertical;
          min-height: 5rem;
          line-height: 1.45;
        }
        .review-field input:focus,
        .review-field textarea:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
        }
        .star-picker {
          display: flex;
          gap: 0.2rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .star-picker-btn {
          background: none;
          border: none;
          padding: 0.15rem;
          cursor: pointer;
          line-height: 0;
          border-radius: 8px;
        }
        .star-picker-btn:focus-visible {
          outline: 2px solid #8b5cf6;
          outline-offset: 2px;
        }
        .review-char-count {
          display: block;
          text-align: right;
          font-size: 0.72rem;
          color: #94a3b8;
          font-weight: 600;
          margin-top: 0.35rem;
        }
        .review-submit {
          margin-top: 0.35rem;
        }
        .review-feedback {
          margin: 0.85rem 0 0;
          font-size: 0.88rem;
          font-weight: 600;
        }
        .review-feedback-success {
          color: #047857;
        }
        .reviews-empty {
          grid-column: 1 / -1;
        }
        
        .video-grid { 
          border-radius: 24px; 
          overflow: hidden; 
          border: 1px solid #f1f5f9; 
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          background: #0f172a;
        }

        .video-grid iframe,
        .cloudinary-video {
          width: 100%;
          height: 315px;
          border: none;
          display: block;
        }

        .cloudinary-video {
          background: #000;
        }

        .video-fallback-link {
          display: block;
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: #93c5fd;
          background: #111827;
          text-align: center;
          text-decoration: none;
          border-top: 1px solid rgba(148, 163, 184, 0.25);
        }

        .video-fallback-link:hover {
          color: #dbeafe;
          text-decoration: underline;
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
