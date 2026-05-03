'use client';

import Link from 'next/link';
import { ArrowLeft, MapPin, Music2, CalendarDays, Star, Euro, Clock3 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import SocialShareActions from '../../../../components/SocialShareActions';
import PublicRepertoire from '../../../../components/PublicRepertoire';

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('sr-Latn-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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
      const embedded = parsed.pathname.split('/embed/')[1];
      return embedded ? `https://www.youtube.com/embed/${embedded}` : '';
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

export default function MusicianProfileClient({ musicianId, initialMusician = null }) {
  const [musician, setMusician] = useState(initialMusician);
  const [isLoading, setIsLoading] = useState(!initialMusician);
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState(null);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteForm, setInviteForm] = useState({
    eventDate: '',
    location: '',
    feeEur: '',
    message: '',
  });

  useEffect(() => {
    if (initialMusician) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/musicians/${musicianId}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setError(data?.error || 'Profil nije pronađen.');
          setMusician(null);
          return;
        }

        setMusician(data);
      } catch {
        if (!cancelled) {
          setError('Došlo je do greške pri učitavanju profila.');
          setMusician(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [musicianId]);

  useEffect(() => {
    let cancelled = false;

    const loadViewer = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !data?.user) {
          setViewer(null);
          return;
        }
        setViewer(data.user);
      } catch {
        if (!cancelled) setViewer(null);
      }
    };

    loadViewer();
    return () => {
      cancelled = true;
    };
  }, []);

  const embeddedVideo = useMemo(() => extractVideoEmbed(musician?.videoUrl), [musician?.videoUrl]);
  const isDemoMusician = String(musician?.id || '').startsWith('demo-musician-');
  const viewerIsBand = Boolean(viewer?.bandId);
  const viewerIsMusician = Boolean(viewer?.musicianProfileId);
  const canInvite = (viewerIsBand || viewerIsMusician) && !isDemoMusician && viewer?.musicianProfileId !== musicianId;
  const inviteFormReady = viewerIsMusician
    ? Boolean(String(inviteForm.message || '').trim())
    : Boolean(inviteForm.eventDate)
      && Boolean(String(inviteForm.location || '').trim())
      && Boolean(String(inviteForm.message || '').trim())
      && Number(inviteForm.feeEur) > 0;
  const highlightMissing = !inviteFormReady;
  const missingDate = !viewerIsMusician && highlightMissing && !inviteForm.eventDate;
  const missingFee = !viewerIsMusician && highlightMissing && Number(inviteForm.feeEur) <= 0;
  const missingLocation = !viewerIsMusician && highlightMissing && !String(inviteForm.location || '').trim();
  const missingMessage = highlightMissing && !String(inviteForm.message || '').trim();
  const inviteMissingField = viewerIsMusician
    ? (!String(inviteForm.message || '').trim() ? 'poruka' : '')
    : !inviteForm.eventDate
      ? 'datum'
      : Number(inviteForm.feeEur) <= 0
        ? 'pozitivan honorar'
        : !String(inviteForm.location || '').trim()
          ? 'lokacija'
          : !String(inviteForm.message || '').trim()
            ? 'poruka'
            : '';

  const handleInviteChange = (key, value) => {
    setInviteForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!musician?.id || !canInvite) return;

    setInviteSending(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      const res = await fetch('/api/musicians/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          musicianId: musician.id,
          eventDate: inviteForm.eventDate || null,
          location: inviteForm.location || null,
          feeEur: inviteForm.feeEur || null,
          message: inviteForm.message || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Slanje poziva nije uspelo.');
      }

      setInviteSuccess('Poziv je uspešno poslat muzičaru.');
      setInviteForm({ eventDate: '', location: '', feeEur: '', message: '' });
    } catch (err) {
      setInviteError(err?.message || 'Greška pri slanju poziva.');
    } finally {
      setInviteSending(false);
    }
  };

  const availabilityPreview = useMemo(() => {
    if (!Array.isArray(musician?.availabilities)) return [];
    return musician.availabilities.slice(0, 8);
  }, [musician?.availabilities]);

  if (isLoading) {
    return (
      <div className="musician-public-page page-below-fixed-nav">
        <main className="container musician-public-shell" style={{ maxWidth: 860, margin: '4rem auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', alignItems: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', animation: 'skeleton-pulse 1.4s ease infinite', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ height: 26, width: '50%', borderRadius: 8, background: 'rgba(255,255,255,0.07)', animation: 'skeleton-pulse 1.4s ease infinite' }} />
              <div style={{ height: 15, width: '30%', borderRadius: 6, background: 'rgba(255,255,255,0.05)', animation: 'skeleton-pulse 1.4s ease infinite 0.1s' }} />
            </div>
          </div>
          {[1,2,3,4].map((i) => (
            <div key={i} style={{ height: 16, borderRadius: 6, marginBottom: '0.65rem', width: `${90 - i * 8}%`, background: 'rgba(255,255,255,0.05)', animation: `skeleton-pulse 1.4s ease infinite ${i * 0.1}s` }} />
          ))}
          <style>{`@keyframes skeleton-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </main>
      </div>
    );
  }

  if (error || !musician) {
    return (
      <div className="musician-public-page page-below-fixed-nav">
        <main className="container musician-public-shell">
          <div className="state-box error">{error || 'Muzičar nije pronađen.'}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="musician-public-page page-below-fixed-nav">
      <main className="container musician-public-shell">
        <Link href="/muzicari" className="back-link-public">
          <ArrowLeft size={14} /> Nazad na pretragu
        </Link>

        <section className="musician-public-grid">
          <article className="profile-main-card">
            <div className="profile-image-wrap">
              {musician.img ? (
                <img src={musician.img} alt={musician.name} className="profile-image" />
              ) : (
                <div className="profile-image-fallback">
                  <Music2 size={52} />
                </div>
              )}
            </div>

            <div className="profile-title-row">
              <div>
                <h1 className="profile-name">{musician.name}</h1>
                <p className="profile-instrument">{musician.primaryInstrument}</p>
                {isDemoMusician ? <p className="demo-badge">Demo profil</p> : null}
              </div>
              <span className={`availability-pill ${musician.isAvailable ? 'ok' : 'busy'}`}>
                {musician.isAvailable ? 'Dostupan za angažman' : 'Trenutno zauzet'}
              </span>
            </div>

            <div className="profile-meta-grid">
              <p><MapPin size={15} /> {musician.city}</p>
              <p><Star size={15} /> Ocena {Number(musician.rating || 0).toFixed(1)}</p>
              <p><Euro size={15} />
                {musician.priceFromEur != null
                  ? musician.priceToEur != null
                    ? `${musician.priceFromEur}€ - ${musician.priceToEur}€`
                    : `${musician.priceFromEur}€+`
                  : 'Cena po dogovoru'}
              </p>
              <p><Clock3 size={15} />
                {musician.experienceYears != null ? `${musician.experienceYears} godina iskustva` : 'Iskustvo po dogovoru'}
              </p>
            </div>

            <div className="genres-block">
              <p className="block-label">Žanrovi</p>
              <p className="block-value">{musician.genres || 'Nije navedeno'}</p>
            </div>

            <div className="bio-block">
              <p>{musician.bio || 'Muzičar još nije dodao detaljan opis profila.'}</p>
              {isDemoMusician ? (
                <p className="demo-note">Ovaj profil je demo prikaz za pregled funkcionalnosti.</p>
              ) : null}
            </div>

            <div className="share-row">
              <SocialShareActions
                variant="light"
                url={`/muzicari/${musician.id}`}
                title={`${musician.name} — Muzičar | Pronađi Bend`}
                text={`Pogledaj profil muzičara ${musician.name} na platformi Pronađi Bend.`}
              />
            </div>
          </article>

          <aside className="profile-side-stack">
            <section className="side-card">
              <h2>Dostupnost (naredni termini)</h2>
              {(() => {
                const busyOnly = availabilityPreview.filter((item) => item.isAvailable === false);
                if (busyOnly.length > 0) {
                  return (
                    <>
                      <p className="muted-copy" style={{ marginBottom: '0.5rem' }}>
                        Muzičar je generalno dostupan, osim na sledećim datumima:
                      </p>
                      <ul className="availability-list">
                        {busyOnly.map((item, idx) => (
                          <li key={`${item.date}-${idx}`}>
                            <span className="date-text"><CalendarDays size={14} /> {formatDate(item.date)}</span>
                            <span className="date-status busy">Zauzet</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  );
                }
                return (
                  <p className="muted-copy">
                    Muzičar je trenutno dostupan. Pošaljite upit za proveru konkretnog termina.
                  </p>
                );
              })()}
            </section>

            {embeddedVideo && (
              <section className="side-card">
                <h2>Video prezentacija</h2>
                <iframe
                  src={embeddedVideo}
                  title={`${musician.name} video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="video-frame"
                />
              </section>
            )}

            <section className="side-card invite-card">
              <h2>Pošalji upit za saradnju</h2>
              {!viewer ? (
                <p className="muted-copy">Prijavite se da biste poslali poziv za saradnju.</p>
              ) : !canInvite ? (
                <p className="muted-copy">{isDemoMusician ? 'Demo profili ne primaju pozive.' : 'Ne možete poslati poziv ovom profilu.'}</p>
              ) : (
                <form className="invite-form" onSubmit={handleInviteSubmit}>
                  {inviteError ? <div className="feedback error">{inviteError}</div> : null}
                  {inviteSuccess ? <div className="feedback success">{inviteSuccess}</div> : null}
                  <p className="muted-copy" style={{ marginTop: 0 }}>
                    {viewerIsMusician ? 'Obavezno: poruka. Datum, lokacija i honorar su opcioni.' : 'Obavezno: datum, honorar, lokacija i poruka.'}
                  </p>

                  <div className="invite-inline-grid">
                    <input
                      type="date"
                      required={viewerIsBand}
                      className={missingDate ? 'invite-missing' : ''}
                      value={inviteForm.eventDate}
                      onChange={(e) => handleInviteChange('eventDate', e.target.value)}
                    />
                    <input
                      type="number"
                      min="1"
                      required={viewerIsBand}
                      className={missingFee ? 'invite-missing' : ''}
                      placeholder={viewerIsMusician ? 'Honorar (€)' : 'Honorar (€) *'}
                      value={inviteForm.feeEur}
                      onChange={(e) => handleInviteChange('feeEur', e.target.value)}
                    />
                  </div>

                  <input
                    type="text"
                    required={viewerIsBand}
                    className={missingLocation ? 'invite-missing' : ''}
                    placeholder={viewerIsMusician ? 'Lokacija (opciono)' : 'Lokacija nastupa *'}
                    value={inviteForm.location}
                    onChange={(e) => handleInviteChange('location', e.target.value)}
                  />

                  <textarea
                    rows={4}
                    required
                    className={missingMessage ? 'invite-missing' : ''}
                    placeholder="Poruka muzičaru (termin, uslovi, detalji...) *"
                    value={inviteForm.message}
                    onChange={(e) => handleInviteChange('message', e.target.value)}
                  />

                  <button type="submit" disabled={inviteSending || !inviteFormReady} className="btn btn-primary invite-submit-btn">
                    {inviteSending ? 'Slanje...' : 'Pošalji poziv'}
                  </button>
                  {!inviteFormReady ? (
                    <p className="invite-required-hint">Popunite obavezno polje: {inviteMissingField}.</p>
                  ) : null}
                </form>
              )}
            </section>
          </aside>
        </section>

        {Array.isArray(musician.songs) && musician.songs.length > 0 && (
          <section className="musician-repertoire-wrap">
            <PublicRepertoire songs={musician.songs} />
          </section>
        )}
      </main>

      <style jsx>{`
        .musician-public-page {
          min-height: 100vh;
          background: var(--bg, #030308);
          padding-bottom: 4rem;
          overflow-x: hidden;
          width: 100%;
        }
        .musician-public-shell {
          padding-top: 8rem;
          padding-bottom: 2rem;
          max-width: 860px;
          margin: 0 auto;
          padding-left: 1.25rem;
          padding-right: 1.25rem;
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
        }
        .state-box {
          border: 1px dashed rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 1.2rem;
          color: #94a3b8;
          background: rgba(255,255,255,0.03);
          font-weight: 700;
        }
        .state-box.error {
          color: #fca5a5;
          border-color: rgba(239,68,68,0.3);
          background: rgba(239,68,68,0.06);
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
        .musician-public-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
          gap: 1.5rem;
          align-items: start;
          width: 100%;
          min-width: 0;
        }
        .profile-main-card,
        .side-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 1rem;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
          min-width: 0;
          overflow: hidden;
        }
        .profile-image-wrap {
          aspect-ratio: 16 / 10;
          border-radius: 14px;
          overflow: hidden;
          background: rgba(255,255,255,0.04);
        }
        .profile-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .profile-image-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
        }
        .profile-title-row {
          margin-top: 0.9rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .profile-name {
          margin: 0;
          font-size: clamp(1.7rem, 3vw, 2.3rem);
          font-weight: 900;
          color: #f8fafc;
          line-height: 1.05;
        }
        .profile-instrument {
          margin: 0.35rem 0 0;
          font-size: 0.95rem;
          font-weight: 800;
          color: #007aff;
        }
        .demo-badge {
          margin: 0.4rem 0 0;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          background: rgba(0, 122, 255, 0.1);
          color: #007aff;
          padding: 0.26rem 0.55rem;
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
        }
        .availability-pill {
          border-radius: 999px;
          padding: 0.34rem 0.7rem;
          font-size: 0.72rem;
          font-weight: 800;
          white-space: nowrap;
        }
        .availability-pill.ok {
          background: rgba(16, 185, 129, 0.12);
          color: #047857;
        }
        .availability-pill.busy {
          background: rgba(245, 158, 11, 0.12);
          color: #b45309;
        }
        .profile-meta-grid {
          margin-top: 0.95rem;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.55rem 0.9rem;
        }
        .profile-meta-grid p {
          margin: 0;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          color: #cbd5e1;
          font-size: 0.86rem;
          font-weight: 700;
        }
        .genres-block {
          margin-top: 0.95rem;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.03);
          padding: 0.8rem;
        }
        .block-label {
          margin: 0;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 800;
          color: #94a3b8;
        }
        .block-value {
          margin: 0.35rem 0 0;
          font-size: 0.92rem;
          font-weight: 700;
          color: #e2e8f0;
        }
        .bio-block {
          margin-top: 0.95rem;
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 0.95rem;
        }
        .bio-block p {
          margin: 0;
          color: #cbd5e1;
          line-height: 1.72;
          font-size: 1.01rem;
          white-space: pre-line;
          overflow-wrap: anywhere;
        }
        .demo-note {
          margin-top: 0.5rem !important;
          font-size: 0.78rem !important;
          font-weight: 700;
          color: #007aff !important;
        }
        .share-row {
          margin-top: 0.95rem;
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 0.9rem;
        }
        .profile-side-stack {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .side-card h2 {
          margin: 0;
          font-size: 1rem;
          font-weight: 900;
          color: #f1f5f9;
        }
        .availability-list {
          list-style: none;
          margin: 0.75rem 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .availability-list li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          padding: 0.55rem 0.7rem;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.03);
        }
        .date-text {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.84rem;
          font-weight: 700;
          color: #e2e8f0;
        }
        .date-status {
          border-radius: 999px;
          padding: 0.24rem 0.58rem;
          font-size: 0.66rem;
          font-weight: 800;
          text-transform: uppercase;
        }
        .date-status.ok {
          background: rgba(16, 185, 129, 0.12);
          color: #047857;
        }
        .date-status.busy {
          background: rgba(245, 158, 11, 0.12);
          color: #b45309;
        }
        .muted-copy {
          margin: 0.68rem 0 0;
          color: #94a3b8;
          font-size: 0.86rem;
          line-height: 1.5;
        }
        .video-frame {
          margin-top: 0.75rem;
          width: 100%;
          min-height: 228px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #0f172a;
        }
        .invite-card {
          border-color: rgba(139, 92, 246, 0.2);
          background: linear-gradient(180deg, rgba(139, 92, 246, 0.04) 0%, rgba(5, 5, 12, 0.6) 100%);
        }
        .invite-form {
          margin-top: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .invite-form input,
        .invite-form textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          color: #f1f5f9;
          padding: 0.62rem 0.72rem;
          font-size: 0.86rem;
          outline: none;
        }
        .invite-form input:focus,
        .invite-form textarea:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
        }
        .invite-form textarea {
          resize: vertical;
          min-height: 5.2rem;
          line-height: 1.42;
        }
        .invite-inline-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.55rem;
        }
        .feedback {
          border-radius: 10px;
          padding: 0.62rem 0.72rem;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .feedback.error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.25);
          color: #fca5a5;
        }
        .feedback.success {
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.25);
          color: #6ee7b7;
        }
        .invite-submit-btn {
          width: fit-content;
          min-height: 40px;
          margin-top: 0.25rem;
        }
        .invite-required-hint {
          margin: 0;
          font-size: 0.76rem;
          color: #fbbf24;
          font-weight: 700;
        }
        .invite-form .invite-missing {
          border-color: #dc2626 !important;
          box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.14);
        }

        @media (max-width: 980px) {
          .musician-public-grid {
            grid-template-columns: 1fr;
          }
          .profile-main-card,
          .side-card {
            border-radius: 16px;
          }
        }

        @media (max-width: 640px) {
          .musician-public-shell {
            padding-top: 6.5rem;
            padding-left: 0.85rem;
            padding-right: 0.85rem;
          }
          .profile-meta-grid,
          .invite-inline-grid {
            grid-template-columns: 1fr;
          }
          .profile-name {
            font-size: 1.5rem;
            word-break: break-word;
          }
          .profile-title-row {
            flex-direction: column;
            gap: 0.5rem;
          }
          .availability-pill {
            font-size: 0.66rem;
            padding-inline: 0.55rem;
            align-self: flex-start;
          }
          .video-frame {
            min-height: 180px;
          }
          .profile-main-card,
          .side-card {
            padding: 0.85rem;
            border-radius: 14px;
          }
          .profile-image-wrap {
            border-radius: 10px;
          }
        }
      `}</style>
    </div>
  );
}
