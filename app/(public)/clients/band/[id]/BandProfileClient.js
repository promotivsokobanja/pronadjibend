'use client';
import { Mail, Phone, MapPin, Calendar, Star, Send, Shield, Music, Video, Info, User, MessageSquare, ArrowLeft, Image as ImageIcon, BadgeCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import BookingCalendar from '../../../../../components/BookingCalendar';
import SocialShareActions from '../../../../../components/SocialShareActions';
import PublicRepertoire from '../../../../../components/PublicRepertoire';

const BOOKING_MESSAGE_MAX = 500;
const MAX_BOOKING_DATES = 14;
const REVIEW_COMMENT_MAX = 250;

function getVideoEmbedUrl(url) {
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
      const short = parsed.pathname.split('/embed/')[1];
      return short ? `https://www.youtube.com/embed/${short}` : '';
    }
    if (host.includes('vimeo.com')) {
      const segments = parsed.pathname.split('/').filter(Boolean);
      const id = segments[segments.length - 1];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : '';
    }
    return '';
  } catch {
    return '';
  }
}

function isCloudinaryVideo(url) {
  try {
    return new URL(url).hostname.toLowerCase().includes('res.cloudinary.com');
  } catch {
    return false;
  }
}

function formatDateKeySr(ymd) {
  const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(ymd);
  const [, y, mo, d] = m;
  return `${parseInt(d, 10)}. ${parseInt(mo, 10)}. ${y}.`;
}

export default function BandProfileClient({ params, initialBand = null }) {
  const [band, setBand] = useState(initialBand);
  const [reviews, setReviews] = useState([]);
  const [busyDates, setBusyDates] = useState([]);
  const [isLoading, setIsLoading] = useState(!initialBand);
  
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

  // Contact message state
  const [contactForm, setContactForm] = useState({ senderName: '', senderEmail: '', subject: '', body: '' });
  const [contactStatus, setContactStatus] = useState('');

  // Musician invite state
  const [isMusicianAccount, setIsMusicianAccount] = useState(false);
  const [inviteForm, setInviteForm] = useState({ message: '', eventDate: '', location: '', feeEur: '' });
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteResult, setInviteResult] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.musicianProfileId) setIsMusicianAccount(true);
    }).catch(() => {});
  }, []);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.message.trim()) { alert('Poruka je obavezna.'); return; }
    setInviteSending(true);
    setInviteResult('');
    try {
      const resp = await fetch('/api/musicians/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandId: params.id,
          message: inviteForm.message,
          eventDate: inviteForm.eventDate || undefined,
          location: inviteForm.location || undefined,
          feeEur: inviteForm.feeEur ? Number(inviteForm.feeEur) : undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Greška');
      setInviteResult('success');
      setInviteForm({ message: '', eventDate: '', location: '', feeEur: '' });
    } catch (err) {
      setInviteResult(err.message);
    } finally {
      setInviteSending(false);
    }
  };

  const handleContactSend = async (e) => {
    e.preventDefault();
    setContactStatus('sending');
    try {
      const resp = await fetch('/api/contact-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId: params.id, ...contactForm }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Greška');
      setContactStatus('success');
      setContactForm({ senderName: '', senderEmail: '', subject: '', body: '' });
    } catch (err) {
      setContactStatus(err.message);
    }
  };

  useEffect(() => {
    const fetchSecondary = async () => {
      try {
        const [reviewsRes, calendarRes] = await Promise.all([
          fetch(`/api/bands/reviews?bandId=${params.id}`),
          fetch(`/api/bands/calendar?bandId=${params.id}`)
        ]);
        const [reviewsData, calendarData] = await Promise.all([
          reviewsRes.json(),
          calendarRes.json()
        ]);
        setReviews(reviewsData);
        setBusyDates(calendarData.allBusy || []);
      } catch (err) {
        console.error(err);
      }
    };

    if (initialBand) {
      fetchSecondary();
      return;
    }

    const fetchAll = async () => {
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
    fetchAll();
  }, [params.id, initialBand]);

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

  if (isLoading) return (
    <div style={{ maxWidth: 900, margin: '6rem auto', padding: '0 1.5rem' }}>
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', alignItems: 'center' }}>
        <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', animation: 'skeleton-pulse 1.4s ease infinite' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ height: 28, width: '55%', borderRadius: 8, background: 'rgba(255,255,255,0.07)', animation: 'skeleton-pulse 1.4s ease infinite' }} />
          <div style={{ height: 16, width: '35%', borderRadius: 6, background: 'rgba(255,255,255,0.05)', animation: 'skeleton-pulse 1.4s ease infinite 0.1s' }} />
        </div>
      </div>
      {[1,2,3].map((i) => (
        <div key={i} style={{ height: 18, borderRadius: 6, marginBottom: '0.75rem', width: `${85 - i * 10}%`, background: 'rgba(255,255,255,0.05)', animation: `skeleton-pulse 1.4s ease infinite ${i * 0.1}s` }} />
      ))}
      <style>{`@keyframes skeleton-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
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
          <Link href="/clients" className="back-link-public">
            <ArrowLeft size={14} /> Nazad na pretragu
          </Link>
          <div className="hero-grid">
            <div className="hero-content">
              <span className="badge">{band.genre}</span>
              <h1 className="band-name">{band.name}{band.verified && <BadgeCheck size={28} className="verified-badge" />}</h1>
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
              <div className="hero-share-row">
                <SocialShareActions
                  variant="light"
                  url={`/clients/band/${params.id}`}
                  title={`${band.name} — Pronađi Bend`}
                  text={`Pogledaj profil benda ${band.name} na platformi Pronađi Bend.`}
                />
              </div>
              {band.audioUrl && (
                <div className="audio-snippet">
                  <Music size={16} />
                  <span className="audio-snippet-label">Demo snimak</span>
                  <audio controls preload="none" src={band.audioUrl} style={{ flex: 1, height: 32, minWidth: 0 }} />
                </div>
              )}
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

            {isMusicianAccount && (
              <div className="booking-card glass-card" style={{ marginTop: '1.2rem' }}>
                <h2>Pošalji poziv bendu</h2>
                <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '1rem' }}>Kao muzičar, možeš kontaktirati ovaj bend i ponuditi saradnju.</p>
                {inviteResult === 'success' ? (
                  <p style={{ color: '#10b981', fontWeight: 700 }}>Poziv je uspešno poslat!</p>
                ) : (
                  <form onSubmit={handleSendInvite}>
                    <div className="input-group input-group-textarea">
                      <MessageSquare size={18} className="textarea-icon" />
                      <div className="textarea-wrap">
                        <textarea rows={3} maxLength={2000} required placeholder="Poruka za bend (obavezno)" value={inviteForm.message} onChange={e => setInviteForm(p => ({ ...p, message: e.target.value }))} />
                      </div>
                    </div>
                    <div className="input-group">
                      <Calendar size={18} />
                      <input type="date" placeholder="Datum (opciono)" value={inviteForm.eventDate} onChange={e => setInviteForm(p => ({ ...p, eventDate: e.target.value }))} />
                    </div>
                    <div className="input-group">
                      <MapPin size={18} />
                      <input type="text" placeholder="Lokacija (opciono)" value={inviteForm.location} onChange={e => setInviteForm(p => ({ ...p, location: e.target.value }))} />
                    </div>
                    <div className="input-group">
                      <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>€</span>
                      <input type="number" min="0" placeholder="Honorar u EUR (opciono)" value={inviteForm.feeEur} onChange={e => setInviteForm(p => ({ ...p, feeEur: e.target.value }))} />
                    </div>
                    {inviteResult && inviteResult !== 'success' && (
                      <p style={{ color: '#f87171', fontSize: '0.82rem' }}>{inviteResult}</p>
                    )}
                    <button className="btn btn-primary btn-full" type="submit" disabled={inviteSending}>
                      {inviteSending ? 'Slanje...' : 'Pošalji poziv'}
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="booking-card glass-card" style={{ marginTop: '1.2rem' }}>
              <h2><Mail size={20} /> Pošaljite poruku bendu</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '1rem' }}>Imate pitanje? Kontaktirajte bend direktno.</p>
              {contactStatus === 'success' ? (
                <p style={{ color: '#10b981', fontWeight: 700 }}>Poruka je uspešno poslata!</p>
              ) : (
                <form onSubmit={handleContactSend}>
                  <div className="input-group">
                    <User size={18} />
                    <input type="text" placeholder="Vaše ime" required value={contactForm.senderName} onChange={e => setContactForm(p => ({ ...p, senderName: e.target.value }))} />
                  </div>
                  <div className="input-group">
                    <Mail size={18} />
                    <input type="email" placeholder="Vaš email" required value={contactForm.senderEmail} onChange={e => setContactForm(p => ({ ...p, senderEmail: e.target.value }))} />
                  </div>
                  <div className="input-group">
                    <Info size={18} />
                    <input type="text" placeholder="Naslov (opciono)" value={contactForm.subject} onChange={e => setContactForm(p => ({ ...p, subject: e.target.value }))} />
                  </div>
                  <div className="input-group input-group-textarea">
                    <MessageSquare size={18} className="textarea-icon" />
                    <div className="textarea-wrap">
                      <textarea rows={3} maxLength={1000} required placeholder="Vaša poruka..." value={contactForm.body} onChange={e => setContactForm(p => ({ ...p, body: e.target.value }))} />
                      <span className="char-count">{contactForm.body.length} / 1000</span>
                    </div>
                  </div>
                  {contactStatus && contactStatus !== 'sending' && contactStatus !== 'success' && (
                    <p style={{ color: '#f87171', fontSize: '0.82rem' }}>{contactStatus}</p>
                  )}
                  <button className="btn btn-primary btn-full" type="submit" disabled={contactStatus === 'sending'}>
                    {contactStatus === 'sending' ? 'Slanje...' : 'Pošalji poruku'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {(() => {
        let galleryImages = [];
        try { galleryImages = band.galleryJson ? JSON.parse(band.galleryJson) : []; } catch {}
        if (!Array.isArray(galleryImages) || galleryImages.length === 0) return null;
        return (
          <section className="media-section container">
            <div className="section-header">
              <h2><ImageIcon size={24} /> Galerija</h2>
            </div>
            <div className="public-gallery-grid">
              {galleryImages.map((url, idx) => (
                <div key={idx} className="public-gallery-item">
                  <NextImage src={url} alt={`${band.name} galerija ${idx + 1}`} width={400} height={300} style={{ objectFit: 'cover', width: '100%', height: '100%' }} sizes="(max-width: 640px) 50vw, 200px" />
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {(() => {
        let packages = [];
        try { packages = band.packagesJson ? JSON.parse(band.packagesJson) : []; } catch {}
        if (!Array.isArray(packages) || packages.length === 0) return null;
        return (
          <section className="media-section container">
            <div className="section-header">
              <h2><Info size={24} /> Paketi Nastupa</h2>
            </div>
            <div className="packages-grid">
              {packages.map((pkg, idx) => (
                <div key={idx} className="package-card glass-card">
                  <h3 className="package-name">{pkg.name}</h3>
                  {pkg.description && <p className="package-desc">{pkg.description}</p>}
                  {pkg.priceEur && <div className="package-price">{pkg.priceEur}€</div>}
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      <section className="media-section container">
        <div className="section-header">
          <h2><Video size={24} /> Video Nastupi</h2>
        </div>
        <div className="video-grid">
          {band.videoUrl ? (() => {
            const embedUrl = getVideoEmbedUrl(band.videoUrl);
            if (embedUrl && embedUrl.includes('youtube')) {
              return (
                <iframe
                  width="100%"
                  height="315"
                  src={embedUrl}
                  title={`Video nastup benda ${band.name}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              );
            }
            if (embedUrl && embedUrl.includes('vimeo')) {
              return (
                <iframe
                  width="100%"
                  height="315"
                  src={embedUrl}
                  title={`Video nastup benda ${band.name}`}
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              );
            }
            if (isCloudinaryVideo(band.videoUrl)) {
              return (
                <video width="100%" height="315" controls preload="metadata" src={band.videoUrl}>
                  Vaš browser ne podržava video.
                </video>
              );
            }
            return <div className="no-media glass-card">Format videa nije prepoznat.</div>;
          })() : (
            <div className="no-media glass-card">Trenutno nema video zapisa.</div>
          )}
        </div>
      </section>

      {Array.isArray(band.songs) && band.songs.length > 0 && (
        <section className="repertoire-section container">
          <PublicRepertoire songs={band.songs} />
        </section>
      )}

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
          background: var(--bg, #030308);
          min-height: 100vh;
          overflow-x: hidden;
          width: 100%;
        }
        
        .profile-hero { 
          padding: 8rem 0 3rem; 
          background: linear-gradient(180deg, rgba(5, 5, 12, 0.95), rgba(3, 3, 8, 0.9));
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .back-link-public {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: #e2e8f0;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 0.76rem;
          margin-bottom: 1rem;
          padding: 0.45rem 0.7rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          text-decoration: none;
        }
        
        .hero-grid {
          display: grid; 
          grid-template-columns: 1.5fr 1fr; 
          gap: 2rem;
          align-items: start; 
        }
        
        .hero-content .badge {
          background: rgba(139, 92, 246, 0.12);
          color: #a78bfa;
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
          font-size: clamp(2rem, 5vw, 3.2rem);
          margin: 0.5rem 0 1rem;
          font-weight: 800; 
          letter-spacing: -0.03em;
          color: #f8fafc;
          line-height: 1.04;
          word-break: break-word;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .verified-badge {
          color: #3b82f6;
          flex-shrink: 0;
          filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.4));
        }
        
        .rating-pill {
          display: flex; 
          align-items: center; 
          gap: 8px; 
          font-weight: 700; 
          font-size: 1rem;
          margin-bottom: 1rem;
          color: #f1f5f9; 
        }
        
        .review-count { 
          color: #94a3b8; 
          font-size: 0.9rem; 
          font-weight: 400; 
        }
        
        .description {
          font-size: 1.15rem; 
          color: #cbd5e1; 
          line-height: 1.72;
          margin-bottom: 1.1rem;
          max-width: 600px;
          white-space: pre-line;
          overflow-wrap: anywhere;
        }
        
        .meta-info {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.55rem 0.9rem;
        }
        .hero-share-row {
          margin-top: 1rem;
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 0.9rem;
        }
        .audio-snippet {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-top: 0.8rem;
          padding: 0.6rem 0.8rem;
          border-radius: 12px;
          background: rgba(139, 92, 246, 0.08);
          border: 1px solid rgba(139, 92, 246, 0.15);
        }
        .audio-snippet-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #c4b5fd;
          white-space: nowrap;
        }
        .audio-snippet audio {
          border-radius: 8px;
        }
        
        .meta-item {
          display: flex; 
          align-items: center; 
          gap: 8px;
          font-weight: 700;
          color: #cbd5e1;
          font-size: 0.88rem;
        }

        .booking-card { 
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
          position: sticky; 
          top: 100px; 
        }
        
        .booking-card h2 { 
          margin-bottom: 1.5rem; 
          font-size: 1.06rem;
          font-weight: 900;
          color: #f1f5f9;
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
          color: #007aff;
          display: flex; 
          align-items: flex-start; 
          gap: 10px; 
          font-weight: 600; 
          background: rgba(0, 122, 255, 0.08);
          padding: 10px 14px; 
          border-radius: 12px; 
        }
        .selected-dates-body { flex: 1; min-width: 0; }
        .selected-dates-label { display: block; margin-bottom: 0.35rem; font-size: 0.8rem; }
        .selected-dates-ul {
          margin: 0;
          padding-left: 1.1rem;
          color: #0f4dcf;
          font-weight: 700;
          line-height: 1.45;
        }
        
        .input-group { 
          position: relative; 
          display: flex; 
          align-items: center; 
          gap: 0.75rem; 
          padding: 0.85rem 1rem; 
          background: rgba(255,255,255,0.03); 
          border: 1px solid rgba(255,255,255,0.1); 
          border-radius: 12px; 
          margin-bottom: 0.75rem; 
          transition: var(--transition);
        }
        
        .input-group:focus-within {
          border-color: #8b5cf6;
          background: rgba(255,255,255,0.05);
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.12);
        }

        .input-group svg { color: #94a3b8; }
        .input-group input { 
          background: none; 
          border: none; 
          color: #f1f5f9; 
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
          color: #f1f5f9;
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
          margin: 3rem 0 1.1rem;
          display: flex; 
          align-items: center; 
          gap: 0.75rem; 
        }
        
        .section-header h2 { 
          font-size: 1.45rem;
          font-weight: 800; 
          color: #f8fafc;
          letter-spacing: -0.02em;
        }

        .review-compose {
          padding: 1.15rem;
          margin-bottom: 1rem;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
        }
        .review-compose-title {
          margin: 0 0 0.5rem;
          font-size: 1.1rem;
          font-weight: 800;
          color: #f1f5f9;
        }
        .review-compose-intro {
          margin: 0 0 1.25rem;
          font-size: 0.85rem;
          color: #94a3b8;
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
          color: #94a3b8;
          margin-bottom: 0.45rem;
        }
        .review-field input,
        .review-field textarea {
          width: 100%;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 0.75rem 0.9rem;
          font-size: 0.95rem;
          color: #f1f5f9;
          background: rgba(255,255,255,0.04);
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
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
        }
        .packages-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
        }
        .package-card {
          padding: 1.2rem;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          text-align: center;
        }
        .package-name {
          font-size: 1.05rem;
          font-weight: 800;
          color: #f1f5f9;
          margin-bottom: 0.5rem;
        }
        .package-desc {
          font-size: 0.85rem;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 0.75rem;
        }
        .package-price {
          font-size: 1.6rem;
          font-weight: 800;
          color: #8b5cf6;
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
          outline: 2px solid #007aff;
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
        
        .public-gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 0.75rem;
        }
        .public-gallery-item {
          aspect-ratio: 4/3;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .public-gallery-item:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .public-gallery-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-grid { 
          border-radius: 20px;
          overflow: hidden; 
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
        }
        
        .reviews-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 1.5rem; 
        }
        
        .review-card { 
          padding: 1.15rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
        }
        
        .rev-header { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 1rem; 
          align-items: center;
        }
        
        .rev-header strong { color: #f1f5f9; font-size: 1rem; }
        .rev-rating { display: flex; gap: 2px; }
        
        .review-card p { 
          color: #cbd5e1; 
          line-height: 1.6; 
          margin-bottom: 1.25rem; 
          font-size: 0.95rem;
        }
        
        .review-card small { color: #94a3b8; font-weight: 500; }
        
        @media (max-width: 968px) {
          .hero-grid { grid-template-columns: 1fr; gap: 1rem; }
          .meta-info { grid-template-columns: 1fr; }
          .band-name { font-size: 2.35rem; }
          .reviews-grid { grid-template-columns: 1fr; }
          .booking-card { position: static; margin-top: 0.4rem; }
          .packages-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
          .public-gallery-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 640px) {
          .profile-hero {
            padding-top: 6.5rem;
            padding-left: 0.85rem;
            padding-right: 0.85rem;
          }
          .band-name {
            font-size: 1.75rem;
          }
          .description {
            font-size: 1rem;
          }
          .booking-card {
            padding: 1rem;
            border-radius: 16px;
          }
          .review-compose,
          .review-card {
            padding: 0.9rem;
            border-radius: 14px;
          }
          .packages-grid { grid-template-columns: 1fr; gap: 0.75rem; }
          .package-card { padding: 1rem; }
          .package-price { font-size: 1.3rem; }
          .public-gallery-grid { grid-template-columns: 1fr 1fr; gap: 0.5rem; }
          .public-gallery-item { border-radius: 10px; height: 140px; }
          .audio-snippet { padding: 0.6rem 0.8rem; }
          .audio-snippet audio { height: 32px; }
          .hero-share-row { flex-wrap: wrap; gap: 0.5rem; }
          .contact-form-section { padding: 1rem; }
        }
      `}</style>
    </div>
  );
}
