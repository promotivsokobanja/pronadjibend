'use client';

import { Save, ArrowLeft, Image as ImageIcon, Video, Mail, Phone, MessageSquare, Download, Lock, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SocialShareActions from '../../../../components/SocialShareActions';

export default function BandProfilePage() {
  const router = useRouter();
  const [bandId, setBandId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    genre: '',
    location: '',
    priceRange: '',
    bio: '',
    img: '',
    videoUrl: '',
    allowTips: true,
    showRepertoire: false,
    allowFullRepertoireLive: false,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [adminNoBand, setAdminNoBand] = useState(false);
  const [confirmedBookings, setConfirmedBookings] = useState([]);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [siteOrigin, setSiteOrigin] = useState('');
  const [viewerPlan, setViewerPlan] = useState('');
  const publicBandProfilePath = bandId ? `/clients/band/${bandId}` : '';
  const publicBandProfileUrl = publicBandProfilePath ? `${siteOrigin}${publicBandProfilePath}` : '';
  const isPremiumVenue = String(viewerPlan || '').toUpperCase() === 'PREMIUM_VENUE';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteOrigin(window.location.origin || '');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.replace('/login');
          return;
        }
        const meData = await meRes.json();
        setViewerPlan(String(meData?.user?.plan || ''));
        const currentBandId = meData?.user?.bandId;
        if (!currentBandId) {
          if (meData?.user?.role === 'ADMIN') {
            setAdminNoBand(true);
            return;
          }
          setAdminNoBand(false);
          setError('Nalog nije povezan sa bend profilom.');
          return;
        }
        setAdminNoBand(false);
        setBandId(currentBandId);

        const [res, bookRes] = await Promise.all([
          fetch(`/api/bands/${currentBandId}`),
          fetch(`/api/bookings?bandId=${encodeURIComponent(currentBandId)}`),
        ]);

        if (bookRes.ok) {
          const books = await bookRes.json();
          if (Array.isArray(books)) {
            const confirmed = books
              .filter((b) => b.status === 'CONFIRMED')
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setConfirmedBookings(confirmed);
          } else {
            setConfirmedBookings([]);
          }
        } else {
          setConfirmedBookings([]);
        }

        if (!res.ok) return;
        const band = await res.json();
        setFormData({
          name: band.name || '',
          genre: band.genre || '',
          location: band.location || '',
          priceRange: band.priceRange || '',
          bio: band.bio || '',
          img: band.img || '',
          videoUrl: band.videoUrl || '',
          allowTips: band.allowTips !== false,
          showRepertoire: band.showRepertoire || false,
          allowFullRepertoireLive: band.allowFullRepertoireLive || false,
        });
      } catch (err) {
        setError('Ne mogu da učitam profil benda.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Nova lozinka i potvrda se ne poklapaju.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Nova lozinka mora imati najmanje 6 karaktera.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Greška pri promeni lozinke.');
      }
      setPasswordSuccess('Lozinka je uspešno promenjena.');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setShowPasswordForm(false), 2000);
    } catch (err) {
      setPasswordError(err.message || 'Došlo je do greške.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      let resolvedBandId = bandId;
      if (!resolvedBandId) {
        const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
        const meData = await meRes.json().catch(() => ({}));
        resolvedBandId = String(meData?.user?.bandId || '').trim();
        if (resolvedBandId) {
          setBandId(resolvedBandId);
        }
      }

      if (!resolvedBandId) {
        throw new Error('Bend profil nije pronađen.');
      }

      const res = await fetch(`/api/bands/${resolvedBandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Greška pri snimanju.');
      }
      router.push('/bands?saved=1');
    } catch (err) {
      setError(err.message || 'Došlo je do greške.');
    } finally {
      setSaving(false);
    }
  };

  const getYouTubeEmbedUrl = (url) => {
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
      return '';
    } catch {
      return '';
    }
  };

  const getVimeoEmbedUrl = (url) => {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.toLowerCase().includes('vimeo.com')) return '';
      const segments = parsed.pathname.split('/').filter(Boolean);
      const id = segments[segments.length - 1];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : '';
    } catch {
      return '';
    }
  };

  const isCloudinaryVideo = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.toLowerCase().includes('res.cloudinary.com');
    } catch {
      return false;
    }
  };

  const handleUpload = async (file, kind) => {
    if (kind === 'video' && !isPremiumVenue) {
      setError('Upload videa je dostupan samo za Premium Venue članove.');
      return;
    }
    const setUploading = kind === 'image' ? setUploadingImage : setUploadingVideo;
    const setProgress = kind === 'image' ? setImageProgress : setVideoProgress;
    setUploading(true);
    setProgress(0);
    setError('');
    setSuccess('');
    try {
      const payload = new FormData();
      payload.append('file', file);
      payload.append('kind', kind);
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/media/upload');

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
        };

        xhr.onload = () => {
          try {
            const parsed = JSON.parse(xhr.responseText || '{}');
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(parsed);
              return;
            }
            const msg = parsed?.error || parsed?.full?.message || parsed?.full?.error_description || JSON.stringify(parsed?.full) || 'Upload nije uspeo.';
            reject(new Error(msg));
          } catch {
            reject(new Error('Upload nije uspeo.'));
          }
        };

        xhr.onerror = () => reject(new Error('Greška pri upload-u.'));
        xhr.send(payload);
      });

      if (kind === 'image') {
        setFormData((prev) => ({ ...prev, img: data.url }));
      } else {
        setFormData((prev) => ({ ...prev, videoUrl: data.url }));
      }

      setSuccess(
        kind === 'image'
          ? 'Slika je uploadovana i optimizovana.'
          : 'Video je uploadovan i optimizovan za streaming.'
      );
    } catch (err) {
      setError(err.message || 'Greška pri upload-u.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleFilePick = (event, kind) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleUpload(file, kind);
    event.target.value = '';
  };

  const handleDrop = (event, kind) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    handleUpload(file, kind);
  };

  return (
    <div className="container" style={{ paddingTop: '9.5rem', paddingBottom: '5rem' }}>
      <div className="profile-wrap">
        <div className="profile-header">
          <div>
            <Link href="/bands" className="back-link">
              <ArrowLeft size={15} />
              Nazad na portal
            </Link>
            <h1>Moj Profil Benda</h1>
            <p>Ovde uređujete slike, video i opis koji klijenti vide na platformi.</p>
            {!loading && bandId && !adminNoBand ? (
              <div style={{ margin: '0.8rem 0 0.25rem' }}>
                <SocialShareActions
                  url={publicBandProfileUrl || publicBandProfilePath}
                  title={`${formData.name || 'Bend'} — Profil | Pronađi Bend`}
                  text="Pogledaj naš javni profil benda na platformi Pronađi Bend."
                />
              </div>
            ) : null}
            {!loading && bandId && !adminNoBand ? (
              <p className="profile-poster-hint">
                <a
                  href={`/api/bands/${encodeURIComponent(bandId)}/marketing-poster`}
                  className="profile-poster-link"
                >
                  <Download size={16} aria-hidden />
                  Preuzmi poster za tvoj bend (A4, 300 DPI) — QR vodi na tvoju live stranicu za goste
                </a>
              </p>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="state-box">Učitavanje profila...</div>
        ) : adminNoBand ? (
          <div className="profile-card state-box" style={{ maxWidth: 520 }}>
            <p style={{ marginBottom: '1rem', color: 'var(--text-muted, #94a3b8)' }}>
              Ulogovani ste kao administrator — ovaj ekran služi za uređivanje javnog profila benda. Bez povezanog
              bend naloga nema šta da se menja ovde.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <Link href="/admin" className="btn btn-primary">
                Admin panel
              </Link>
              <Link href="/bands" className="btn btn-secondary">
                Portal za muzičare
              </Link>
            </div>
          </div>
        ) : (
          <>
            {confirmedBookings.length > 0 && (
              <section className="profile-card confirmed-msgs">
                <div className="confirmed-msgs-head">
                  <MessageSquare size={22} className="confirmed-msgs-icon" />
                  <div>
                    <h2>Potvrđeni upiti — poruke klijenata</h2>
                    <p className="confirmed-msgs-sub">
                      Pojavljuju se čim administrator potvrdi rezervaciju.
                    </p>
                  </div>
                </div>
                <ul className="confirmed-list">
                  {confirmedBookings.map((b) => {
                    const bDate = new Date(b.date);
                    const dateStr = bDate.toLocaleDateString('sr-Latn-RS', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    });
                    return (
                      <li key={b.id} className="client-msg-card">
                        <div className="client-msg-meta">
                          <strong>{b.clientName || 'Klijent'}</strong>
                          <span className="client-msg-date">{dateStr}</span>
                          {b.location ? <span className="client-msg-loc">{b.location}</span> : null}
                        </div>
                        {b.message ? (
                          <p className="client-msg-body">{b.message}</p>
                        ) : (
                          <p className="client-msg-body muted">Bez dodatne poruke.</p>
                        )}
                        <div className="client-msg-contact">
                          {b.clientEmail ? (
                            <a href={`mailto:${b.clientEmail}`} className="contact-chip">
                              <Mail size={14} /> {b.clientEmail}
                            </a>
                          ) : null}
                          {b.clientPhone ? (
                            <a href={`tel:${b.clientPhone.replace(/\s/g, '')}`} className="contact-chip">
                              <Phone size={14} /> {b.clientPhone}
                            </a>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <form onSubmit={handleSave} className="profile-card">
            {error && <div className="alert error">{error}</div>}
            {success && <div className="alert success">{success}</div>}

            {publicBandProfilePath ? (
              <div className="field profile-link-field">
                <label>Javni link profila</label>
                <div className="profile-link-row">
                  <input value={publicBandProfileUrl || publicBandProfilePath} readOnly />
                  <Link href={publicBandProfilePath} target="_blank" className="btn btn-secondary btn-sm">
                    Otvori profil
                  </Link>
                </div>
                <SocialShareActions
                  url={publicBandProfileUrl || publicBandProfilePath}
                  title={`${formData.name || 'Bend'} — Profil | Pronađi Bend`}
                  text="Pogledaj naš javni profil benda na platformi Pronađi Bend."
                />
              </div>
            ) : null}

            <div className="field toggle-field">
              <label className="toggle-label" htmlFor="allow-tips">
                Omogući opciju bakšiša za goste
              </label>
              <p className="toggle-hint">
                Na live stranici gosti mogu da pošalju bakšiš preko konobara uz narudžbinu pesme (ako je uključeno).
              </p>
              <button
                type="button"
                id="allow-tips"
                role="switch"
                aria-checked={formData.allowTips}
                className={`tips-toggle ${formData.allowTips ? 'on' : ''}`}
                onClick={() => handleChange('allowTips', !formData.allowTips)}
              >
                <span className="tips-toggle-knob" />
              </button>
            </div>

            {viewerPlan && (viewerPlan.toUpperCase() === 'PREMIUM' || viewerPlan.toUpperCase() === 'PREMIUM_VENUE') && (
              <>
                <div className="field toggle-field">
                  <label className="toggle-label" htmlFor="show-repertoire">
                    Prikaži repertoar javno
                  </label>
                  <p className="toggle-hint">
                    Omogućava drugima da vide tvoj repertoar kada pretražuju bendove (samo za premium korisnike).
                  </p>
                  <button
                    type="button"
                    id="show-repertoire"
                    role="switch"
                    aria-checked={formData.showRepertoire}
                    className={`tips-toggle ${formData.showRepertoire ? 'on' : ''}`}
                    onClick={() => handleChange('showRepertoire', !formData.showRepertoire)}
                  >
                    <span className="tips-toggle-knob" />
                  </button>
                </div>

                <div className="field toggle-field">
                  <label className="toggle-label" htmlFor="allow-full-repertoire-live">
                    Dozvoli ceo repertoar za live narudžbine
                  </label>
                  <p className="toggle-hint">
                    Kada je uključeno, gosti na live stranici mogu da naruče bilo koju pesmu iz tvog repertoara, nezavisno od set liste (samo za premium korisnike).
                  </p>
                  <button
                    type="button"
                    id="allow-full-repertoire-live"
                    role="switch"
                    aria-checked={formData.allowFullRepertoireLive}
                    className={`tips-toggle ${formData.allowFullRepertoireLive ? 'on' : ''}`}
                    onClick={() => handleChange('allowFullRepertoireLive', !formData.allowFullRepertoireLive)}
                  >
                    <span className="tips-toggle-knob" />
                  </button>
                </div>
              </>
            )}

            <div className="grid">
              <div className="field">
                <label>Naziv benda</label>
                <input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="npr. Beogradski Trio"
                  required
                />
              </div>

              <div className="field">
                <label>Žanr</label>
                <input
                  value={formData.genre}
                  onChange={(e) => handleChange('genre', e.target.value)}
                  placeholder="Pop/Rock"
                  required
                />
              </div>

              <div className="field">
                <label>Lokacija</label>
                <input
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Beograd"
                  required
                />
              </div>

              <div className="field">
                <label>Raspon cene</label>
                <input
                  value={formData.priceRange}
                  onChange={(e) => handleChange('priceRange', e.target.value)}
                  placeholder="od 400€"
                />
              </div>
            </div>

            <div className="field">
              <label>Opis benda</label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Kratak opis nastupa, iskustva i repertoara..."
                rows={5}
              />
            </div>

            <div className="media-grid">
              <div className="field">
                <label>
                  <ImageIcon size={14} /> URL glavne slike
                </label>
                <input
                  value={formData.img}
                  onChange={(e) => handleChange('img', e.target.value)}
                  placeholder="https://..."
                />
                <div className="upload-row">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFilePick(e, 'image')}
                  />
                  <div
                    className="drop-zone"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, 'image')}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    Prevuci sliku ovde ili klikni za upload
                  </div>
                  <span>{uploadingImage ? 'Upload slike u toku...' : 'Auto resize: max 1600px, webp'}</span>
                  {uploadingImage && (
                    <div className="progress-wrap">
                      <div className="progress-bar" style={{ width: `${imageProgress}%` }} />
                    </div>
                  )}
                </div>
                {formData.img && (
                  <img src={formData.img} alt="Preview" className="preview-image" />
                )}
              </div>

              <div className="field">
                <label>
                  <Video size={14} /> URL videa (YouTube dozvoljen)
                </label>
                <input
                  value={formData.videoUrl}
                  onChange={(e) => handleChange('videoUrl', e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <small className="field-hint">
                  {isPremiumVenue
                    ? 'Prihvaćeni su YouTube, Vimeo i Cloudinary video linkovi.'
                    : 'Upload videa je dostupan samo za Premium Venue članove.'}
                </small>
                <div className="upload-row">
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    disabled={!isPremiumVenue}
                    onChange={(e) => handleFilePick(e, 'video')}
                  />
                  <div
                    className={`drop-zone ${!isPremiumVenue ? 'disabled' : ''}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      if (!isPremiumVenue) return;
                      handleDrop(e, 'video');
                    }}
                    onClick={() => {
                      if (!isPremiumVenue) return;
                      videoInputRef.current?.click();
                    }}
                  >
                    {isPremiumVenue ? 'Prevuci video ovde ili klikni za upload' : 'Video upload je zaključan (Premium Venue)'}
                  </div>
                  <span>
                    {uploadingVideo
                      ? 'Upload videa u toku...'
                      : isPremiumVenue
                        ? 'Auto optimize: quality auto, max 1280p'
                        : 'Nadogradite plan na Premium Venue za video upload'}
                  </span>
                  {uploadingVideo && (
                    <div className="progress-wrap">
                      <div className="progress-bar" style={{ width: `${videoProgress}%` }} />
                    </div>
                  )}
                </div>
                {getYouTubeEmbedUrl(formData.videoUrl) && (
                  <iframe
                    className="video-preview"
                    src={getYouTubeEmbedUrl(formData.videoUrl)}
                    title="YouTube preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
                {!getYouTubeEmbedUrl(formData.videoUrl) && getVimeoEmbedUrl(formData.videoUrl) && (
                  <iframe
                    className="video-preview"
                    src={getVimeoEmbedUrl(formData.videoUrl)}
                    title="Vimeo preview"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                )}
                {!getYouTubeEmbedUrl(formData.videoUrl) &&
                  !getVimeoEmbedUrl(formData.videoUrl) &&
                  isCloudinaryVideo(formData.videoUrl) && (
                    <video className="video-preview" controls preload="metadata" src={formData.videoUrl}>
                      Vaš browser ne podržava video preview.
                    </video>
                  )}
              </div>
            </div>

            <button type="submit" className="btn btn-primary save-btn">
              <Save size={16} /> {saving ? 'Čuvanje...' : 'Sačuvaj izmene'}
            </button>
          </form>

          {/* Password Change Section */}
          <section className="profile-card password-section">
            <div className="password-header">
              <div className="password-header-text">
                <h3><Lock size={18} /> Promena lozinke</h3>
                <p>Promenite lozinku za pristup vašem nalogu</p>
              </div>
              {!showPasswordForm && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowPasswordForm(true);
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                >
                  Promeni lozinku
                </button>
              )}
            </div>

            {showPasswordForm && (
              <form onSubmit={handlePasswordChange} className="password-form">
                {passwordError && <div className="alert error">{passwordError}</div>}
                {passwordSuccess && <div className="alert success">{passwordSuccess}</div>}

                <div className="field">
                  <label>Trenutna lozinka</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Unesite trenutnu lozinku"
                    required
                  />
                </div>

                <div className="field">
                  <label>Nova lozinka</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Unesite novu lozinku (min. 6 karaktera)"
                    required
                    minLength={6}
                  />
                </div>

                <div className="field">
                  <label>Potvrdi novu lozinku</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Ponovite novu lozinku"
                    required
                  />
                </div>

                <div className="password-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setPasswordError('');
                      setPasswordSuccess('');
                    }}
                  >
                    Otkaži
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
                    <Lock size={16} /> {passwordSaving ? 'Čuvanje...' : 'Sačuvaj lozinku'}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="profile-card delete-section">
            <div className="password-header">
              <div className="password-header-text">
                <h3 className="danger-title"><Trash2 size={18} /> Brisanje naloga</h3>
                <p>Trajno brisanje vašeg naloga, profila i svih povezanih podataka.</p>
              </div>
              {!showDeleteConfirm && (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)}>
                  Obriši nalog
                </button>
              )}
            </div>
            {showDeleteConfirm && (
              <div className="password-form">
                <p style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.85rem' }}>
                  Da li ste sigurni? Ova akcija je nepovratna. Unesite lozinku za potvrdu.
                </p>
                <div className="field">
                  <label>Lozinka za potvrdu</label>
                  <input
                    type="password"
                    placeholder="Vaša lozinka"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                  />
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={deleting}
                    onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}
                  >
                    Odustani
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={deleting}
                    onClick={async () => {
                      setDeleting(true);
                      setError('');
                      try {
                        const res = await fetch('/api/account/self', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ password: deletePassword }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(data?.error || 'Brisanje nije uspelo.');
                        window.location.href = '/';
                      } catch (err) {
                        setError(err?.message || 'Greška pri brisanju naloga.');
                        setDeleting(false);
                      }
                    }}
                  >
                    <Trash2 size={16} /> {deleting ? 'Brisanje...' : 'Potvrdi brisanje'}
                  </button>
                </div>
              </div>
            )}
          </section>
          </>
        )}
      </div>

      <style jsx>{`
        .profile-wrap { max-width: 920px; margin: 0 auto; }
        .profile-header h1 { font-size: 2.1rem; font-weight: 900; color: #0f172a; margin-bottom: 0.3rem; }
        .profile-header p { color: #64748b; }
        .profile-header p:not(.profile-poster-hint) { margin-bottom: 0.55rem; }
        .profile-poster-hint { margin: 0 0 1.4rem; }
        .profile-poster-link {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.88rem;
          font-weight: 700;
          color: #0d9488;
          text-decoration: none;
        }
        .profile-poster-link:hover { text-decoration: underline; }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: #334155;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 0.76rem;
          margin-bottom: 0.9rem;
          padding: 0.45rem 0.7rem;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(255, 255, 255, 0.9);
          position: relative;
          z-index: 3;
          transition: 0.2s ease;
        }
        .back-link:hover { color: #0f172a; border-color: rgba(100, 116, 139, 0.75); }
        .profile-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 1.4rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .media-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .field { display: flex; flex-direction: column; gap: 0.45rem; }
        .field label {
          font-size: 0.75rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }
        .field input, .field textarea {
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 0.7rem 0.85rem;
          font-size: 0.93rem;
          color: #0f172a;
          outline: none;
        }
        .field input:focus, .field textarea:focus {
          border-color: #007aff;
          box-shadow: 0 0 0 4px rgba(0,122,255,0.12);
        }
        .field-hint {
          color: #64748b;
          font-size: 0.75rem;
          margin-top: -0.1rem;
        }
        .profile-link-field {
          margin-bottom: 0.35rem;
        }
        .profile-link-row {
          display: flex;
          gap: 0.6rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .profile-link-row :global(.btn) {
          min-height: 42px;
        }
        .toggle-field {
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 0.35rem;
        }
        .toggle-label {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          text-transform: none;
          letter-spacing: 0;
        }
        .toggle-hint {
          font-size: 0.8rem;
          color: #64748b;
          line-height: 1.45;
          margin: 0;
        }
        .tips-toggle {
          width: 52px;
          height: 28px;
          border-radius: 999px;
          border: none;
          background: #cbd5e1;
          position: relative;
          cursor: pointer;
          transition: background 0.2s;
          align-self: flex-start;
        }
        .tips-toggle.on {
          background: #22c55e;
        }
        .tips-toggle-knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 22px;
          height: 22px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }
        .tips-toggle.on .tips-toggle-knob {
          transform: translateX(24px);
        }
        .upload-row {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          border: 1px dashed #cbd5e1;
          border-radius: 10px;
          padding: 0.6rem 0.7rem;
          background: #f8fafc;
          margin-top: 0.1rem;
        }
        .upload-row input[type="file"] {
          display: none;
        }
        .drop-zone {
          border: 1px dashed #93c5fd;
          background: #eff6ff;
          color: #1d4ed8;
          border-radius: 9px;
          padding: 0.65rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          text-align: center;
        }
        .drop-zone:hover { background: #dbeafe; }
        .drop-zone.disabled,
        .drop-zone.disabled:hover {
          border-color: #cbd5e1;
          background: #f1f5f9;
          color: #94a3b8;
          cursor: not-allowed;
        }
        .upload-row span {
          color: #64748b;
          font-size: 0.74rem;
          font-weight: 600;
        }
        .progress-wrap {
          width: 100%;
          height: 8px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
        }
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #007aff, #38bdf8);
          transition: width 0.15s ease;
        }
        .preview-image {
          margin-top: 0.4rem;
          width: 100%;
          max-height: 180px;
          object-fit: cover;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        .video-preview {
          margin-top: 0.4rem;
          width: 100%;
          height: 190px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #000;
        }
        .save-btn { width: fit-content; margin-top: 0.2rem; gap: 0.5rem; }
        .state-box {
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          padding: 1.2rem;
          color: #64748b;
          background: #f8fafc;
          font-weight: 600;
        }
        .alert {
          border-radius: 10px;
          padding: 0.75rem 0.9rem;
          font-size: 0.84rem;
          font-weight: 700;
        }
        .alert.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .alert.success { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
        
        .delete-section {
          margin-top: 1.5rem;
          border-color: #fecaca;
          background: #fef2f2;
        }
        .danger-title {
          color: #dc2626 !important;
        }
        .btn-danger {
          background: #e11d48;
          color: #fff;
          border-color: #e11d48;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }
        .btn-danger:hover {
          background: #be123c;
          border-color: #be123c;
        }
        .password-section {
          margin-top: 1.5rem;
        }
        .password-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .password-header-text h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 0.25rem;
        }
        .password-header-text p {
          margin: 0;
          color: #64748b;
          font-size: 0.85rem;
        }
        .password-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
        }
        .password-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }
        .password-actions .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }
        
        @media (max-width: 860px) {
          .grid, .media-grid { grid-template-columns: 1fr; }
          .profile-card { padding: 1.1rem; }
          .password-header { flex-direction: column; gap: 0.75rem; }
          .password-actions { flex-direction: column; align-items: stretch; }
          .password-actions .btn { width: 100%; justify-content: center; min-height: 46px; }
        }
        @media (max-width: 560px) {
          .profile-wrap { padding: 0 0.15rem; }
          .profile-header h1 { font-size: 1.6rem; }
          .profile-card { padding: 0.9rem; border-radius: 16px; }
          .field input, .field textarea { padding: 0.6rem 0.75rem; font-size: 0.9rem; border-radius: 10px; }
          .profile-link-row { flex-direction: column; align-items: stretch; }
          .profile-link-row :global(.btn) { width: 100%; justify-content: center; }
          .drop-zone { padding: 0.85rem 0.65rem; font-size: 0.78rem; }
        }
        .confirmed-msgs {
          margin-bottom: 1.5rem;
          border-color: rgba(0, 122, 255, 0.28);
          background: linear-gradient(180deg, #f0f7ff 0%, #fff 48%);
        }
        .confirmed-msgs-head {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }
        .confirmed-msgs-icon { color: #007aff; flex-shrink: 0; margin-top: 0.15rem; }
        .confirmed-msgs-head h2 {
          font-size: 1.12rem;
          font-weight: 900;
          color: #0f172a;
          margin: 0 0 0.25rem;
        }
        .confirmed-msgs-sub {
          margin: 0;
          color: #64748b;
          font-size: 0.84rem;
          font-weight: 600;
        }
        .confirmed-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .client-msg-card {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 1rem 1.1rem;
          background: #fff;
        }
        .client-msg-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem 0.75rem;
          align-items: baseline;
          margin-bottom: 0.65rem;
          font-size: 0.88rem;
        }
        .client-msg-meta strong { color: #0f172a; }
        .client-msg-date { color: #64748b; font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; }
        .client-msg-loc { color: #475569; font-weight: 600; }
        .client-msg-body {
          margin: 0 0 0.75rem;
          white-space: pre-wrap;
          color: #1e293b;
          font-size: 0.93rem;
          line-height: 1.5;
        }
        .client-msg-body.muted { color: #94a3b8; font-style: italic; }
        .client-msg-contact {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem 0.75rem;
        }
        .contact-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          font-weight: 700;
          color: #1d4ed8;
          text-decoration: none;
          padding: 0.35rem 0.65rem;
          background: #eff6ff;
          border-radius: 999px;
          border: 1px solid #bfdbfe;
        }
        .contact-chip:hover { background: #dbeafe; }
      `}</style>
    </div>
  );
}
