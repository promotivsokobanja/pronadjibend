'use client';

import { Save, ArrowLeft, Image as ImageIcon, Video } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

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
        const currentBandId = meData?.user?.bandId;
        if (!currentBandId) {
          setError('Nalog nije povezan sa bend profilom.');
          return;
        }
        setBandId(currentBandId);

        const res = await fetch(`/api/bands/${currentBandId}`);
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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!bandId) {
      setError('Bend profil nije pronađen.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/bands/${bandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Greška pri snimanju.');
      }
      setSuccess('Profil je uspešno sačuvan.');
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
            reject(new Error(parsed?.error || 'Upload nije uspeo.'));
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
          </div>
        </div>

        {loading ? (
          <div className="state-box">Učitavanje profila...</div>
        ) : (
          <form onSubmit={handleSave} className="profile-card">
            {error && <div className="alert error">{error}</div>}
            {success && <div className="alert success">{success}</div>}

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

            <button type="submit" className="btn btn-primary save-btn" disabled={saving || !bandId}>
              <Save size={16} /> {saving ? 'Čuvanje...' : 'Sačuvaj izmene'}
            </button>
          </form>
        )}
      </div>

      <style jsx>{`
        .profile-wrap { max-width: 920px; margin: 0 auto; }
        .profile-header h1 { font-size: 2.1rem; font-weight: 900; color: #0f172a; margin-bottom: 0.3rem; }
        .profile-header p { color: #64748b; margin-bottom: 1.4rem; }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 0.72rem;
          margin-bottom: 0.9rem;
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
        @media (max-width: 860px) {
          .grid, .media-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
