'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Save, UserRound, Mail, CalendarDays, Euro, MapPin, Music, Video, Image as ImageIcon } from 'lucide-react';

const initialForm = {
  name: '',
  primaryInstrument: '',
  genres: '',
  city: '',
  priceFromEur: '',
  priceToEur: '',
  experienceYears: '',
  bio: '',
  img: '',
  videoUrl: '',
  isAvailable: true,
};

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('sr-Latn-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function MusicianProfileEditorClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewer, setViewer] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [invites, setInvites] = useState([]);
  const [inviteMutation, setInviteMutation] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [meRes, profileRes, invitesRes] = await Promise.all([
          fetch('/api/auth/me', { cache: 'no-store' }),
          fetch('/api/musicians/profile', { cache: 'no-store' }),
          fetch('/api/musicians/invites', { cache: 'no-store' }),
        ]);

        const meData = await meRes.json().catch(() => ({}));
        const profileData = await profileRes.json().catch(() => ({}));
        const invitesData = await invitesRes.json().catch(() => ({}));

        if (cancelled) return;

        if (!meRes.ok || !meData?.user) {
          setError('Morate biti prijavljeni da biste uređivali profil muzičara.');
          setViewer(null);
          return;
        }

        setViewer(meData.user);

        if (profileRes.ok && profileData?.profile) {
          const p = profileData.profile;
          setForm({
            name: p.name || '',
            primaryInstrument: p.primaryInstrument || '',
            genres: p.genres || '',
            city: p.city || '',
            priceFromEur: p.priceFromEur != null ? String(p.priceFromEur) : '',
            priceToEur: p.priceToEur != null ? String(p.priceToEur) : '',
            experienceYears: p.experienceYears != null ? String(p.experienceYears) : '',
            bio: p.bio || '',
            img: p.img || '',
            videoUrl: p.videoUrl || '',
            isAvailable: p.isAvailable !== false,
          });
        }

        if (invitesRes.ok && invitesData?.mode === 'received' && Array.isArray(invitesData.invites)) {
          setInvites(invitesData.invites);
        } else {
          setInvites([]);
        }
      } catch {
        if (!cancelled) setError('Greška pri učitavanju muzičarskog profila.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInviteStatus = async (inviteId, status) => {
    if (!inviteId) return;
    setInviteMutation(inviteId);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/musicians/invites/${encodeURIComponent(inviteId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || 'Izmena statusa nije uspela.');
      }

      setInvites((prev) => prev.map((item) => (item.id === inviteId ? { ...item, status } : item)));
      setSuccess(status === 'ACCEPTED' ? 'Poziv je prihvaćen.' : 'Poziv je odbijen.');
    } catch (err) {
      setError(err?.message || 'Greška pri izmeni statusa poziva.');
    } finally {
      setInviteMutation(null);
    }
  };

  const isBandAccount = Boolean(viewer?.bandId);

  const profilePreview = useMemo(() => {
    const instrument = form.primaryInstrument || 'Instrument';
    const city = form.city || 'Grad';
    const name = form.name || 'Ime muzičara';
    return `${name} • ${instrument} • ${city}`;
  }, [form]);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
    if (!file) return;
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
        xhr.open('POST', '/api/media/upload', true);

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
        setForm((prev) => ({ ...prev, img: data.url }));
      } else {
        setForm((prev) => ({ ...prev, videoUrl: data.url }));
      }

      setSuccess(kind === 'image' ? 'Slika je uploadovana i optimizovana.' : 'Video je uploadovan i optimizovan za streaming.');
    } catch (err) {
      setError(err?.message || 'Greška pri upload-u.');
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

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/musicians/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || 'Čuvanje nije uspelo.');
      }

      setSuccess('Profil muzičara je uspešno sačuvan.');
    } catch (err) {
      setError(err?.message || 'Greška pri čuvanju profila.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '9.5rem', paddingBottom: '5rem' }}>
      <div className="profile-wrap musician-profile-wrap">
        <div className="profile-header">
          <div>
            <Link href="/bands" className="back-link">
              <ArrowLeft size={15} />
              Nazad na portal
            </Link>
            <h1>Moj Profil Muzičara</h1>
            <p>Ovde uređujete sliku, video i opis koji bendovi vide na platformi.</p>
            <p className="profile-poster-hint musician-badge">
              <UserRound size={16} aria-hidden />
              {profilePreview}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="state-box">Učitavanje profila...</div>
        ) : isBandAccount ? (
          <div className="profile-card state-box" style={{ maxWidth: 520 }}>
            <p style={{ marginBottom: '1rem', color: 'var(--text-muted, #94a3b8)' }}>
              Ovaj ekran je namenjen solo muzičarima. Trenutno ste prijavljeni kao bend nalog.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <Link href="/bands" className="btn btn-primary">
                Portal za muzičare
              </Link>
              <Link href="/muzicari" className="btn btn-secondary">
                Javni prikaz muzičara
              </Link>
            </div>
          </div>
        ) : (
          <div className="musician-layout">
            <form onSubmit={onSubmit} className="profile-card">
              {error ? <div className="alert error">{error}</div> : null}
              {success ? <div className="alert success">{success}</div> : null}

              <div className="field toggle-field">
                <label className="toggle-label" htmlFor="musician-availability">
                  Dostupan za angažman
                </label>
                <p className="toggle-hint">
                  Kada je opcija uključena, bendovi vas lakše pronalaze i mogu da vam šalju pozive.
                </p>
                <button
                  type="button"
                  id="musician-availability"
                  role="switch"
                  aria-checked={form.isAvailable}
                  className={`tips-toggle ${form.isAvailable ? 'on' : ''}`}
                  onClick={() => onChange('isAvailable', !form.isAvailable)}
                >
                  <span className="tips-toggle-knob" />
                </button>
              </div>

              <div className="grid">
                <div className="field">
                  <label>Ime i prezime</label>
                  <input value={form.name} onChange={(e) => onChange('name', e.target.value)} placeholder="npr. Marko Marković" required />
                </div>
                <div className="field">
                  <label>Primarni instrument</label>
                  <input value={form.primaryInstrument} onChange={(e) => onChange('primaryInstrument', e.target.value)} placeholder="Gitara, vokal, klavijatura..." required />
                </div>
                <div className="field">
                  <label>Grad</label>
                  <input value={form.city} onChange={(e) => onChange('city', e.target.value)} placeholder="Beograd" required />
                </div>
                <div className="field">
                  <label>Žanrovi</label>
                  <input value={form.genres} onChange={(e) => onChange('genres', e.target.value)} placeholder="Pop, Rock, Narodna" />
                </div>
              </div>

              <div className="grid musician-three-grid">
                <div className="field">
                  <label>Cena od (€)</label>
                  <input type="number" min="0" value={form.priceFromEur} onChange={(e) => onChange('priceFromEur', e.target.value)} placeholder="100" />
                </div>
                <div className="field">
                  <label>Cena do (€)</label>
                  <input type="number" min="0" value={form.priceToEur} onChange={(e) => onChange('priceToEur', e.target.value)} placeholder="300" />
                </div>
                <div className="field">
                  <label>Iskustvo (god)</label>
                  <input type="number" min="0" value={form.experienceYears} onChange={(e) => onChange('experienceYears', e.target.value)} placeholder="10" />
                </div>
              </div>

              <div className="field">
                <label>Biografija</label>
                <textarea rows={5} value={form.bio} onChange={(e) => onChange('bio', e.target.value)} placeholder="Kratak opis nastupa, iskustva i repertoara..." />
              </div>

              <div className="media-grid">
                <div className="field">
                  <label>
                    <ImageIcon size={14} /> URL glavne slike
                  </label>
                  <input value={form.img} onChange={(e) => onChange('img', e.target.value)} placeholder="https://..." />
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
                    {uploadingImage ? (
                      <div className="progress-wrap">
                        <div className="progress-bar" style={{ width: `${imageProgress}%` }} />
                      </div>
                    ) : null}
                  </div>
                  {form.img ? <img src={form.img} alt="Preview" className="preview-image" /> : null}
                </div>
                <div className="field">
                  <label>
                    <Video size={14} /> URL videa
                  </label>
                  <input value={form.videoUrl} onChange={(e) => onChange('videoUrl', e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
                  <small className="field-hint">Prihvaćeni su YouTube, Vimeo i Cloudinary video linkovi.</small>
                  <div className="upload-row">
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleFilePick(e, 'video')}
                    />
                    <div
                      className="drop-zone"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, 'video')}
                      onClick={() => videoInputRef.current?.click()}
                    >
                      Prevuci video ovde ili klikni za upload
                    </div>
                    <span>{uploadingVideo ? 'Upload videa u toku...' : 'Auto optimize: quality auto, max 1280p'}</span>
                    {uploadingVideo ? (
                      <div className="progress-wrap">
                        <div className="progress-bar" style={{ width: `${videoProgress}%` }} />
                      </div>
                    ) : null}
                  </div>
                  {getYouTubeEmbedUrl(form.videoUrl) ? (
                    <iframe
                      className="video-preview"
                      src={getYouTubeEmbedUrl(form.videoUrl)}
                      title="YouTube preview"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : null}
                  {!getYouTubeEmbedUrl(form.videoUrl) && getVimeoEmbedUrl(form.videoUrl) ? (
                    <iframe
                      className="video-preview"
                      src={getVimeoEmbedUrl(form.videoUrl)}
                      title="Vimeo preview"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  ) : null}
                  {!getYouTubeEmbedUrl(form.videoUrl) && !getVimeoEmbedUrl(form.videoUrl) && isCloudinaryVideo(form.videoUrl) ? (
                    <video className="video-preview" controls preload="metadata" src={form.videoUrl}>
                      Vaš browser ne podržava video preview.
                    </video>
                  ) : null}
                </div>
              </div>

              <button type="submit" disabled={saving} className="btn btn-primary save-btn">
                <Save size={16} /> {saving ? 'Čuvanje...' : 'Sačuvaj izmene'}
              </button>
            </form>

            <aside className="musician-sidebar">
              <section className="profile-card">
                <h2 className="sidebar-title">Kontakt naloga</h2>
                <p className="sidebar-row"><Mail size={15} /> {viewer?.email || '—'}</p>
                <p className="field-hint">Javni kontakt može kasnije da se proširi telefonom i društvenim mrežama.</p>
              </section>

              <section className="profile-card">
                <h2 className="sidebar-title">Pristigli pozivi bendova</h2>
                {invites.length === 0 ? (
                  <p className="field-hint" style={{ marginTop: '0.2rem' }}>Još nema poziva. Kada bend pošalje poziv, pojaviće se ovde.</p>
                ) : (
                  <ul className="invite-list">
                    {invites.map((inv) => (
                      <li key={inv.id} className="invite-card">
                        <p className="invite-band">{inv.band?.name || 'Bend'}</p>
                        <div className="invite-meta">
                          {inv.eventDate ? <p><CalendarDays size={13} /> {formatDate(inv.eventDate)}</p> : null}
                          {inv.location ? <p><MapPin size={13} /> {inv.location}</p> : null}
                          {inv.feeEur != null ? <p><Euro size={13} /> {inv.feeEur}€</p> : null}
                        </div>
                        {inv.message ? <p className="invite-message">{inv.message}</p> : null}
                        <p className="invite-status">Status: {inv.status}</p>
                        {inv.status === 'PENDING' ? (
                          <div className="invite-actions">
                            <button
                              type="button"
                              disabled={inviteMutation === inv.id}
                              onClick={() => handleInviteStatus(inv.id, 'ACCEPTED')}
                              className="btn btn-primary btn-sm"
                            >
                              Prihvati
                            </button>
                            <button
                              type="button"
                              disabled={inviteMutation === inv.id}
                              onClick={() => handleInviteStatus(inv.id, 'REJECTED')}
                              className="btn btn-secondary btn-sm musician-danger-btn"
                            >
                              Odbij
                            </button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>
          </div>
        )}
      </div>

      <style jsx>{`
        .profile-wrap { max-width: 920px; margin: 0 auto; }
        .musician-profile-wrap { width: 100%; }
        .profile-header h1 { font-size: 2.1rem; font-weight: 900; color: #0f172a; margin-bottom: 0.3rem; }
        .profile-header p { color: #64748b; }
        .profile-header p:not(.profile-poster-hint) { margin-bottom: 0.55rem; }
        .profile-poster-hint { margin: 0 0 1.4rem; }
        .musician-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.88rem;
          font-weight: 700;
          color: #0d9488;
        }
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
          text-decoration: none;
        }
        .back-link:hover { color: #0f172a; border-color: rgba(100, 116, 139, 0.75); }
        .musician-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
          gap: 1.5rem;
          align-items: start;
        }
        .musician-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
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
        .musician-three-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .media-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .field { display: flex; flex-direction: column; gap: 0.45rem; }
        .grid > .field,
        .media-grid > .field,
        .musician-three-grid > .field {
          min-width: 0;
        }
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
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
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
        .tips-toggle.on { background: #22c55e; }
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
        .tips-toggle.on .tips-toggle-knob { transform: translateX(24px); }
        .preview-image {
          margin-top: 0.4rem;
          width: 100%;
          max-height: 180px;
          object-fit: cover;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        .upload-row {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.35rem;
          font-size: 0.75rem;
          color: #64748b;
        }
        .upload-row input[type='file'] {
          display: none;
        }
        .drop-zone {
          border: 1px dashed #94a3b8;
          border-radius: 12px;
          padding: 0.9rem 1rem;
          text-align: center;
          color: #475569;
          background: #f8fafc;
          cursor: pointer;
          transition: 0.2s ease;
        }
        .drop-zone:hover {
          border-color: #007aff;
          background: #eff6ff;
        }
        .progress-wrap {
          width: 100%;
          height: 8px;
          border-radius: 999px;
          background: #e2e8f0;
          overflow: hidden;
        }
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #007aff, #22c55e);
          border-radius: 999px;
          transition: width 0.2s ease;
        }
        .video-preview {
          margin-top: 0.5rem;
          width: 100%;
          min-height: 220px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #0f172a;
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
        .sidebar-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .sidebar-row {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.92rem;
          color: #475569;
          font-weight: 600;
          margin: 0;
        }
        .invite-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }
        .invite-card {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 1rem 1.1rem;
          background: #fff;
        }
        .invite-band {
          margin: 0 0 0.45rem;
          font-weight: 800;
          color: #0f172a;
        }
        .invite-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem 0.8rem;
          color: #64748b;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .invite-meta p {
          margin: 0;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }
        .invite-message {
          margin: 0.7rem 0 0;
          white-space: pre-wrap;
          color: #1e293b;
          font-size: 0.92rem;
          line-height: 1.5;
        }
        .invite-status {
          margin: 0.7rem 0 0;
          color: #1d4ed8;
          font-size: 0.76rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .invite-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
          margin-top: 0.8rem;
        }
        .musician-danger-btn {
          color: #fff;
          background: #e11d48;
          border-color: #e11d48;
        }
        .musician-danger-btn:hover {
          background: #be123c;
          border-color: #be123c;
        }
        @media (max-width: 860px) {
          .musician-layout,
          .grid,
          .media-grid,
          .musician-three-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
