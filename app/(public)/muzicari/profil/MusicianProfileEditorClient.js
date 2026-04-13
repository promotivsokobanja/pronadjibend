'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Save, UserRound, Mail, CalendarDays, Euro, MapPin, Music, Video, Image as ImageIcon, ListMusic, Radio, Headphones, Trash2, QrCode } from 'lucide-react';
import QrModal from '../../../../components/QrModal';
import SocialShareActions from '../../../../components/SocialShareActions';
import ChatThread from '../../../../components/ChatThread';

const ACTIVE_INVITE_STATUSES = new Set(['PENDING', 'ACCEPTED']);

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

export default function MusicianProfileEditorClient({ mode = 'panel' }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewer, setViewer] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [invites, setInvites] = useState([]);
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteView, setInviteView] = useState('active');
  const [inviteMutation, setInviteMutation] = useState(null);
  const [inviteDeleteId, setInviteDeleteId] = useState(null);
  const [panelStats, setPanelStats] = useState({ repertoireCount: 0, liveTodayCount: 0 });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [siteOrigin, setSiteOrigin] = useState('');
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteOrigin(window.location.origin || '');
    }
  }, []);

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

  useEffect(() => {
    const ownerId = viewer?.musicianProfileId;
    if (!ownerId) {
      setPanelStats({ repertoireCount: 0, liveTodayCount: 0 });
      return;
    }

    let cancelled = false;
    const loadPanelStats = async () => {
      try {
        const [countsRes, liveRes] = await Promise.all([
          fetch(`/api/songs/counts?musicianId=${encodeURIComponent(ownerId)}`, { cache: 'no-store' }),
          fetch(`/api/live-requests?musicianId=${encodeURIComponent(ownerId)}`, { cache: 'no-store' }),
        ]);

        const countsData = await countsRes.json().catch(() => ({}));
        const liveData = await liveRes.json().catch(() => ([]));

        if (cancelled) return;

        const repertoireCount = countsData && typeof countsData === 'object'
          ? Object.values(countsData).reduce((sum, value) => sum + (Number(value) || 0), 0)
          : 0;

        const today = new Date();
        const y = today.getFullYear();
        const m = today.getMonth();
        const d = today.getDate();
        const liveTodayCount = Array.isArray(liveData)
          ? liveData.filter((item) => {
              const created = new Date(item?.createdAt || item?.created_at || 0);
              return !Number.isNaN(created.getTime())
                && created.getFullYear() === y
                && created.getMonth() === m
                && created.getDate() === d;
            }).length
          : 0;

        setPanelStats({ repertoireCount, liveTodayCount });
      } catch {
        if (!cancelled) setPanelStats({ repertoireCount: 0, liveTodayCount: 0 });
      }
    };

    loadPanelStats();
    return () => {
      cancelled = true;
    };
  }, [viewer?.musicianProfileId]);

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

  const handleInviteDelete = async (inviteId) => {
    if (!inviteId) return;
    setInviteDeleteId(inviteId);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/musicians/invites/${encodeURIComponent(inviteId)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || 'Brisanje poziva nije uspelo.');
      }

      setInvites((prev) => prev.filter((item) => item.id !== inviteId));
      setSuccess('Poziv je obrisan.');
    } catch (err) {
      setError(err?.message || 'Greška pri brisanju poziva.');
    } finally {
      setInviteDeleteId(null);
    }
  };

  const isSettingsPage = mode === 'settings';
  const isBandAccount = Boolean(viewer?.bandId);
  const isPremiumVenue = String(viewer?.plan || '').toUpperCase() === 'PREMIUM_VENUE';

  const profilePreview = useMemo(() => {
    const instrument = form.primaryInstrument || 'Instrument';
    const city = form.city || 'Grad';
    const name = form.name || 'Ime muzičara';
    return `${name} • ${instrument} • ${city}`;
  }, [form]);

  const dashboardCards = [
    {
      title: 'Live zahtevi',
      description: 'Prati porudžbine gostiju uživo na svirci.',
      href: '/bands/live',
      icon: Radio,
    },
    {
      title: 'QR za Live',
      description: 'Preuzmi poster i QR kod za publiku.',
      onClick: () => setShowQr(true),
      icon: QrCode,
    },
    {
      title: 'Pesmarica',
      description: 'Baza svih dostupnih pesama na sajtu.',
      href: '/bands/pesmarica',
      icon: ListMusic,
    },
    {
      title: 'Moj repertoar',
      description: 'Pesme koje si izabrao za izvođenje iz pesmarice.',
      href: '/bands/repertoire',
      icon: Music,
    },
    {
      title: 'MIDI / Audio',
      description: 'Otpremi matrice i semplove za nastupe.',
      href: '/bands/midi',
      icon: Headphones,
    },
  ];

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

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError('');
    try {
      const res = await fetch('/api/account/self', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Brisanje nije uspelo.');
      }
      window.location.href = '/';
    } catch (err) {
      setError(err?.message || 'Greška pri brisanju naloga.');
      setDeleting(false);
    }
  };

  const backLink = isSettingsPage
    ? { href: '/muzicari/profil', label: 'Nazad na panel' }
    : { href: '/clients', label: 'Nazad na pretragu' };
  const settingsHref = '/muzicari/profil/podesavanja';
  const publicMusicianProfilePath = viewer?.musicianProfileId ? `/muzicari/${viewer.musicianProfileId}` : '';
  const publicMusicianProfileUrl = publicMusicianProfilePath
    ? `${siteOrigin}${publicMusicianProfilePath}`
    : '';

  const contactCard = (
    <section style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '20px', padding: '1.4rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
      <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', paddingBottom: '0.65rem', borderBottom: '1.5px solid #f1f5f9' }}>Kontakt naloga</h2>
      <p style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}><Mail size={15} /> {viewer?.email || '—'}</p>
      <p style={{ color: '#64748b', fontSize: '0.75rem', lineHeight: 1.45, margin: 0 }}>Javni kontakt može kasnije da se proširi telefonom i društvenim mrežama.</p>
    </section>
  );

  const pendingInvites = invites.filter((inv) => inv.status === 'PENDING').length;
  const filteredInvites = useMemo(() => {
    const q = inviteSearch.trim().toLowerCase();
    const groupedInvites = invites.filter((inv) => {
      const status = String(inv?.status || '').toUpperCase();
      return inviteView === 'archive' ? !ACTIVE_INVITE_STATUSES.has(status) : ACTIVE_INVITE_STATUSES.has(status);
    });
    if (!q) return groupedInvites;
    return groupedInvites.filter((inv) => {
      const hay = [
        inv.band?.name,
        inv.message,
        inv.location,
      ];
      return hay.some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [invites, inviteSearch, inviteView]);

  const activeInviteCount = useMemo(
    () => invites.filter((inv) => ACTIVE_INVITE_STATUSES.has(String(inv?.status || '').toUpperCase())).length,
    [invites]
  );

  const archivedInviteCount = useMemo(
    () => invites.filter((inv) => !ACTIVE_INVITE_STATUSES.has(String(inv?.status || '').toUpperCase())).length,
    [invites]
  );

  const sCard = { background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '20px', padding: '1.4rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', boxShadow: '0 4px 16px rgba(15,23,42,0.07)' };
  const sTitle = { margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', paddingBottom: '0.65rem', borderBottom: '1.5px solid #f1f5f9' };
  const sInvCard = { border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '1rem 1.1rem', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.7rem' };
  const sMeta = { display: 'flex', flexWrap: 'wrap', gap: '0.35rem 0.7rem', padding: '0.55rem 0.7rem', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff', color: '#475569', fontSize: '0.8rem', fontWeight: 700 };
  const sMsg = { margin: 0, whiteSpace: 'pre-wrap', color: '#1e293b', fontSize: '0.88rem', lineHeight: 1.5, padding: '0.55rem 0.7rem', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fff' };
  const sActions = { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem', paddingTop: '0.65rem', borderTop: '1.5px solid #e2e8f0' };
  const sPill = (status) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '999px', padding: '0.22rem 0.58rem', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.04em',
    ...(status === 'ACCEPTED' ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' }
      : status === 'REJECTED' || status === 'CANCELLED' ? { background: 'rgba(248,113,113,0.12)', color: '#f87171' }
      : { background: 'rgba(250,204,21,0.12)', color: '#f59e0b' })
  });

  const invitesCard = (
    <section style={sCard}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', paddingBottom: '0.85rem', borderBottom: '1.5px solid #f1f5f9' }}>
        <div>
          <h2 style={sTitle}>Pristigli pozivi bendova</h2>
          <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0.4rem 0 0' }}>Ukupno poziva: {invites.length}</p>
        </div>
        <input
          type="search"
          value={inviteSearch}
          onChange={(e) => setInviteSearch(e.target.value)}
          placeholder="Pretraži bend ili poruku..."
          style={{ width: 'min(260px, 100%)', border: '1px solid #dbe4ef', borderRadius: '999px', padding: '0.43rem 0.8rem', fontSize: '0.78rem', color: '#1e293b', outline: 'none', background: '#fff' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn btn-sm ${inviteView === 'active' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setInviteView('active')}
        >
          Aktivni ({activeInviteCount})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${inviteView === 'archive' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setInviteView('archive')}
        >
          Arhiva ({archivedInviteCount})
        </button>
      </div>
      {filteredInvites.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: '0.75rem' }}>
          {inviteView === 'archive' ? 'Nema arhiviranih poziva za prikaz.' : 'Nema aktivnih poziva koji odgovaraju pretrazi.'}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {filteredInvites.map((inv) => {
            const statusText = String(inv.status || 'PENDING').toUpperCase();
            const isPending = statusText === 'PENDING';
            const statusLoading = inviteMutation === inv.id;
            const deleteLoading = inviteDeleteId === inv.id;
            return (
              <li key={inv.id} style={sInvCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                  {inv.band?.id ? (
                    <Link href={`/clients/band/${inv.band.id}`} style={{ textDecoration: 'none' }} target="_blank">
                      <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{inv.band?.name || 'Bend'}</p>
                    </Link>
                  ) : (
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{inv.band?.name || 'Bend'}</p>
                  )}
                  <span style={sPill(statusText)}>{statusText}</span>
                </div>
                <div style={sMeta}>
                  {inv.eventDate ? <p style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><CalendarDays size={13} /> {formatDate(inv.eventDate)}</p> : null}
                  {inv.location ? <p style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={13} /> {inv.location}</p> : null}
                  {inv.feeEur != null ? <p style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Euro size={13} /> {inv.feeEur}€</p> : null}
                </div>
                {inv.message ? <p style={sMsg}>{inv.message}</p> : null}
                <div style={sActions}>
                  <button
                    type="button"
                    disabled={!isPending || statusLoading || deleteLoading}
                    onClick={() => handleInviteStatus(inv.id, 'ACCEPTED')}
                    className="btn btn-sm btn-primary"
                  >
                    Prihvati
                  </button>
                  <button
                    type="button"
                    disabled={!isPending || statusLoading || deleteLoading}
                    onClick={() => handleInviteStatus(inv.id, 'REJECTED')}
                    className="btn btn-sm btn-secondary"
                  >
                    Odbij
                  </button>
                  <button
                    type="button"
                    disabled={statusLoading || deleteLoading}
                    onClick={() => handleInviteDelete(inv.id)}
                    className="btn btn-sm"
                    style={{ borderColor: 'rgba(248,113,113,0.45)', color: '#f87171', background: 'rgba(255,255,255,0.9)' }}
                  >
                    <Trash2 size={14} /> {deleteLoading ? 'Brisanje...' : 'Obriši'}
                  </button>
                </div>
                <details style={{ marginTop: '0.15rem' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '0.82rem', fontWeight: 800, color: '#475569' }}>Poruke</summary>
                  <ChatThread inviteId={inv.id} />
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  const deleteButtonStyle = {
    background: '#dc2626',
    color: '#ffffff',
    border: '1px solid #dc2626',
    borderRadius: '999px',
    padding: '0.72rem 1.3rem',
    fontWeight: 800,
    fontSize: '0.92rem',
    lineHeight: 1,
  };

  const deleteCard = (
    <section style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '20px', padding: '1.4rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', boxShadow: '0 4px 16px rgba(15,23,42,0.07)' }}>
      <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#dc2626', paddingBottom: '0.65rem', borderBottom: '1.5px solid #fecaca', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Trash2 size={16} /> Brisanje naloga</h2>
      {!showDeleteConfirm ? (
        <>
          <p style={{ color: '#64748b', fontSize: '0.75rem', lineHeight: 1.45, margin: 0 }}>Trajno brisanje vašeg naloga, profila i svih povezanih podataka.</p>
          <button
            type="button"
            className="btn"
            style={deleteButtonStyle}
            onClick={() => setShowDeleteConfirm(true)}
          >
            Obriši moj nalog
          </button>
        </>
      ) : (
        <>
          <p style={{ color: '#dc2626', fontSize: '0.75rem', lineHeight: 1.45, margin: 0 }}>
            Da li ste sigurni? Ova akcija je nepovratna. Unesite lozinku za potvrdu.
          </p>
          <input
            type="password"
            placeholder="Vaša lozinka"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #fecaca', borderRadius: '12px', padding: '0.7rem 0.9rem', fontSize: '0.9rem', outline: 'none' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem', paddingTop: '0.65rem', borderTop: '1.5px solid #fecaca' }}>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
              disabled={deleting}
              onClick={handleDeleteAccount}
            >
              {deleting ? 'Brisanje...' : 'Potvrdi brisanje'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={deleting}
              onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}
            >
              Odustani
            </button>
          </div>
        </>
      )}
    </section>
  );

  const sKpiItem = { display: 'flex', alignItems: 'center', gap: '0.65rem', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '0.85rem 0.8rem', background: '#f8fafc' };
  const sKpiIcon = { width: 38, height: 38, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59,130,246,0.12)', color: '#2563eb' };
  const sKpiLabel = { margin: 0, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', fontWeight: 800 };
  const sKpiValue = { margin: '0.08rem 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 };

  const panelKpiCard = (
    <section style={{ ...sCard, padding: '1.3rem 1.4rem' }}>
      <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', paddingBottom: '0.65rem', borderBottom: '1.5px solid #f1f5f9' }}>Pregled aktivnosti</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: '0.85rem' }}>
        <article style={sKpiItem}>
          <div style={sKpiIcon}><Mail size={16} /></div>
          <div>
            <p style={sKpiLabel}>Aktivni pozivi</p>
            <p style={sKpiValue}>{pendingInvites}</p>
          </div>
        </article>
        <article style={sKpiItem}>
          <div style={sKpiIcon}><Music size={16} /></div>
          <div>
            <p style={sKpiLabel}>Moj repertoar</p>
            <p style={sKpiValue}>{panelStats.repertoireCount}</p>
          </div>
        </article>
        <article style={sKpiItem}>
          <div style={sKpiIcon}><Radio size={16} /></div>
          <div>
            <p style={sKpiLabel}>Live danas</p>
            <p style={sKpiValue}>{panelStats.liveTodayCount}</p>
          </div>
        </article>
      </div>
    </section>
  );

  const summaryCard = (
    <section style={sCard}>
      <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', paddingBottom: '0.6rem', borderBottom: '1.5px solid #f1f5f9' }}>Profil muzičara</h2>
      <p style={{ color: '#475569', fontWeight: 700, marginBottom: '0.6rem' }}>{profilePreview}</p>
      {viewer?.musicianProfileId ? (
        <SocialShareActions
          url={publicMusicianProfileUrl || publicMusicianProfilePath}
          title={`${form.name || 'Muzičar'} — Profil | Pronađi Bend`}
          text={`Pogledaj moj profil muzičara na platformi Pronađi Bend.`}
        />
      ) : null}
      <Link href={settingsHref} className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '1rem' }}>
        Otvori podešavanja
      </Link>
    </section>
  );

  return (
    <div className="container" style={{ paddingTop: '8.75rem', paddingBottom: '5.5rem', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', position: 'relative', zIndex: 1, width: '100%' }}>
        <div style={{ marginBottom: '2rem', padding: '2rem 2.1rem', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(244,243,255,0.96))', border: '1.5px solid #e2e8f0', boxShadow: '0 8px 28px rgba(99,102,241,0.08)', position: 'relative', overflow: 'hidden' }}>
          <div>
            <Link href={backLink.href} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#334155', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.76rem', marginBottom: '1.15rem', padding: '0.52rem 0.8rem', borderRadius: '999px', border: '1px solid rgba(148,163,184,0.5)', background: 'rgba(255,255,255,0.9)', textDecoration: 'none' }}>
              <ArrowLeft size={15} />
              {backLink.label}
            </Link>
            <h1 style={{ fontSize: 'clamp(2.3rem, 4vw, 3.6rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#0f172a', marginBottom: '0.45rem', lineHeight: 1.02 }}>{isSettingsPage ? 'Podešavanja profila' : 'Moj Profil Muzičara'}</h1>
            <p style={{ color: '#64748b', maxWidth: 760, marginBottom: '0.6rem', fontSize: '1rem', lineHeight: 1.65 }}>
              {isSettingsPage
                ? 'Održi svoj javni nastup ažurnim – fotografije, video i opis se uređuju ovde.'
                : 'Ovde upravljaš svojim panelom, pozivima i pristupom live alatima.'}
            </p>
            <p style={{ margin: '0.2rem 0 0', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 700, color: '#4f46e5', padding: '0.7rem 1rem', borderRadius: '999px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.16)' }}>
              <UserRound size={16} aria-hidden />
              {profilePreview}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: '14px', padding: '1.2rem', color: '#64748b', background: '#f8fafc', fontWeight: 600 }}>Učitavanje profila...</div>
        ) : isBandAccount ? (
          <div style={{ ...sCard, maxWidth: 520 }}>
            <p style={{ marginBottom: '1rem', color: '#94a3b8' }}>
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
        ) : isSettingsPage ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: '1.6rem', alignItems: 'start' }}>
            <form onSubmit={onSubmit} className="profile-editor" style={sCard}>
              {error ? <div className="alert error">{error}</div> : null}
              {success ? <div className="alert success">{success}</div> : null}

              {publicMusicianProfilePath ? (
                <div className="field profile-link-field">
                  <label>Javni link profila</label>
                  <div className="profile-link-row">
                    <input value={publicMusicianProfileUrl || publicMusicianProfilePath} readOnly />
                    <Link href={publicMusicianProfilePath} target="_blank" className="btn btn-secondary btn-sm">
                      Otvori profil
                    </Link>
                  </div>
                  <SocialShareActions
                    url={publicMusicianProfileUrl || publicMusicianProfilePath}
                    title={`${form.name || 'Muzičar'} — Profil | Pronađi Bend`}
                    text="Pogledaj moj javni profil muzičara na platformi Pronađi Bend."
                  />
                </div>
              ) : null}

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

              <div className="save-bar">
                <div>
                  <h3>Moj profil</h3>
                  <p>Ove informacije vide bendovi na platformi.</p>
                </div>
                <button type="submit" disabled={saving} className="btn btn-primary save-btn">
                  <Save size={16} /> {saving ? 'Čuvanje...' : 'Sačuvaj izmene'}
                </button>
              </div>
            </form>

            <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
              {contactCard}
              {deleteCard}
            </aside>
          </div>
        ) : (
          <>
            <section className="musician-panel">
              <div className="panel-hero">
                <p className="panel-eyebrow">Moj panel</p>
                <h2>Brzi ulaz u sve alate</h2>
                <p>Sve što ti treba za live nastup i repertoar na jednom mestu.</p>
                <div className="panel-grid">
                  {dashboardCards.map((card) => {
                    const Icon = card.icon;
                    const inner = (
                      <div className="panel-card">
                        <div className="panel-icon">
                          <Icon size={20} />
                        </div>
                        <div>
                          <h3>{card.title}</h3>
                          <p>{card.description}</p>
                        </div>
                        <span className="panel-cta">{card.href ? 'Otvori' : 'Preuzmi'}</span>
                      </div>
                    );
                    if (card.href) {
                      return (
                        <Link key={card.title} href={card.href} className="panel-link">
                          {inner}
                        </Link>
                      );
                    }
                    return (
                      <button
                        key={card.title}
                        type="button"
                        className="panel-link"
                        onClick={card.onClick}
                      >
                        {inner}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section style={{ ...sCard, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>Pozivi bendovima</h2>
              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                <Link href="/clients" className="btn btn-secondary" style={{ borderRadius: '999px', fontWeight: 800 }}>
                  Pronađi bendove
                </Link>
                <Link href="/muzicari" className="btn btn-secondary" style={{ borderRadius: '999px', fontWeight: 800 }}>
                  Pronađi muzičare
                </Link>
              </div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: '1.6rem', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
                {panelKpiCard}
                {summaryCard}
              </div>
              <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
                {contactCard}
                {invitesCard}
              </aside>
            </div>
          </>
        )}
      </div>

      {showQr && viewer?.musicianProfileId && (
        <QrModal musicianId={viewer.musicianProfileId} onClose={() => setShowQr(false)} />
      )}

      <style jsx>{`
        .musician-editor-shell {
          padding-top: 8.75rem;
          padding-bottom: 5.5rem;
          min-height: 100vh;
        }
        .profile-wrap {
          max-width: 1180px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        .musician-profile-wrap { width: 100%; }
        .profile-header {
          margin-bottom: 2rem;
          padding: 2rem 2.1rem;
          border-radius: 32px;
          background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(244, 243, 255, 0.96));
          border: 1px solid rgba(226, 232, 240, 0.92);
          box-shadow: 0 22px 48px rgba(99, 102, 241, 0.08);
          position: relative;
          overflow: hidden;
        }
        .profile-header h1 {
          font-size: clamp(2.3rem, 4vw, 3.6rem);
          font-weight: 900;
          letter-spacing: -0.04em;
          color: #0f172a;
          margin-bottom: 0.45rem;
          line-height: 1.02;
        }
        .profile-header p {
          color: #64748b;
          max-width: 760px;
          position: relative;
          z-index: 1;
        }
        .profile-header p:not(.profile-poster-hint) {
          margin-bottom: 0.6rem;
          font-size: 1rem;
          line-height: 1.65;
        }
        .profile-poster-hint { margin: 0.2rem 0 0; }
        .musician-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 700;
          color: #4f46e5;
          padding: 0.7rem 1rem;
          border-radius: 999px;
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.16);
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
          margin-bottom: 1.15rem;
          padding: 0.52rem 0.8rem;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(255, 255, 255, 0.9);
          position: relative;
          z-index: 3;
          transition: 0.2s ease;
          text-decoration: none;
        }
        .back-link:hover { color: #0f172a; border-color: rgba(100, 116, 139, 0.75); }
        .musician-panel { margin-bottom: 2rem; }
        .panel-hero {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          border-radius: 34px;
          padding: 2.15rem;
          color: #eef2ff;
          box-shadow: 0 30px 60px rgba(79, 70, 229, 0.22);
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.12);
        }
        .panel-eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.35em;
          font-size: 0.62rem;
          font-weight: 800;
          opacity: 0.85;
          margin-bottom: 0.6rem;
        }
        .panel-hero h2 {
          font-size: clamp(1.8rem, 3.2vw, 2.7rem);
          font-weight: 900;
          margin-bottom: 0.4rem;
        }
        .panel-hero p {
          color: rgba(226, 232, 240, 0.9);
          margin-bottom: 1.4rem;
          max-width: 620px;
        }
        .panel-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.05rem;
          position: relative;
          z-index: 1;
        }
        .panel-link {
          all: unset;
          cursor: pointer;
        }
        .panel-card {
          background: rgba(15, 23, 42, 0.4);
          border-radius: 22px;
          border: 1px solid rgba(226, 232, 240, 0.25);
          padding: 1.25rem;
          min-height: 168px;
          display: flex;
          flex-direction: column;
          gap: 0.72rem;
          transition: transform 0.2s, border-color 0.2s, background 0.2s;
        }
        .panel-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255, 255, 255, 0.5);
          background: rgba(15, 23, 42, 0.55);
        }
        .panel-icon {
          width: 46px;
          height: 46px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .panel-card h3 {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: #fff;
        }
        .panel-card p {
          margin: 0;
          color: rgba(226, 232, 240, 0.95);
          font-size: 0.9rem;
          line-height: 1.45;
        }
        .panel-cta {
          margin-top: auto;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(248, 250, 252, 0.9);
        }
        .musician-content {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
          gap: 1.6rem;
          align-items: start;
        }
        .panel-columns {
          gap: 1.6rem;
        }
        .panel-stack {
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
        }
        .musician-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
        }
        .profile-card {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 20px;
          padding: 1.4rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.07), 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        .profile-editor { position: relative; }
        .sidebar-title {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.01em;
          padding-bottom: 0.65rem;
          border-bottom: 1.5px solid #f1f5f9;
        }
        .sidebar-row {
          margin: 0;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          color: #334155;
          font-size: 0.9rem;
        }
        .save-bar {
          margin-top: 1.1rem;
          padding-top: 1rem;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .save-bar h3 {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
        }
        .save-bar p {
          margin: 0.15rem 0 0;
          color: #94a3b8;
          font-size: 0.83rem;
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
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.3rem;
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
          border: 1px solid #d6dee8;
          border-radius: 16px;
          padding: 0.82rem 0.95rem;
          font-size: 0.93rem;
          color: #0f172a;
          outline: none;
          background: rgba(255,255,255,0.96);
        }
        .field input:focus, .field textarea:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99,102,241,0.12);
        }
        .field-hint {
          color: #64748b;
          font-size: 0.75rem;
          line-height: 1.45;
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
          padding: 1rem 1.05rem;
          border: 1px solid rgba(226, 232, 240, 0.95);
          border-radius: 20px;
          background: rgba(255,255,255,0.8);
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
          max-height: 220px;
          object-fit: cover;
          border-radius: 18px;
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
          border-radius: 16px;
          padding: 1rem 1rem;
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
        .drop-zone.disabled,
        .drop-zone.disabled:hover {
          border-color: #cbd5e1;
          background: #f1f5f9;
          color: #94a3b8;
          cursor: not-allowed;
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
          border-radius: 18px;
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
        .panel-summary {
          background: #fff;
          border: 1.5px solid #e2e8f0;
        }
        .panel-summary h2 {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.02em;
          padding-bottom: 0.6rem;
          border-bottom: 1.5px solid #f1f5f9;
        }
        .summary-eyebrow {
          letter-spacing: 0.3em;
          text-transform: uppercase;
          font-size: 0.62rem;
          font-weight: 800;
          color: #818cf8;
          margin-bottom: 0.5rem;
        }
        .summary-subtitle {
          color: #475569;
          font-weight: 700;
          margin-bottom: 0.6rem;
        }
        .summary-copy {
          margin: 0 0 1.1rem;
          color: #64748b;
        }
        .panel-settings-btn {
          align-self: flex-start;
          margin-top: 1rem;
        }
        .panel-kpi-card {
          padding: 1.3rem 1.4rem;
          border: 1.5px solid #e2e8f0;
          background: #ffffff;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.85rem;
        }
        .kpi-item {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          padding: 0.85rem 0.8rem;
          background: #f8fafc;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .kpi-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
          border-color: rgba(99, 102, 241, 0.4);
          background: #fff;
        }
        .kpi-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(59, 130, 246, 0.12);
          color: #2563eb;
        }
        .kpi-label {
          margin: 0;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
          font-weight: 800;
        }
        .kpi-value {
          margin: 0.08rem 0 0;
          font-size: 1.2rem;
          font-weight: 900;
          color: #0f172a;
          line-height: 1;
        }
        .invites-panel {
          padding: 1.3rem 1.4rem;
          border: 1.5px solid #e2e8f0;
        }
        .invites-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding-bottom: 0.85rem;
          border-bottom: 1.5px solid #f1f5f9;
        }
        .invite-search {
          width: min(260px, 100%);
          border: 1px solid #dbe4ef;
          border-radius: 999px;
          padding: 0.43rem 0.8rem;
          font-size: 0.78rem;
          color: #1e293b;
          outline: none;
          background: #fff;
        }
        .invite-search:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
        }
        .invite-empty-state {
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          padding: 0.9rem;
          background: #fff;
          color: #64748b;
          font-size: 0.85rem;
        }
        .invite-empty-state p {
          margin: 0;
          line-height: 1.45;
        }
        .invite-empty-actions {
          margin-top: 0.65rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }
        .invite-section-card {
          border: 1px solid rgba(148, 163, 184, 0.28);
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }
        .invite-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.8rem;
          height: 1.8rem;
          padding: 0 0.5rem;
          border-radius: 999px;
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid rgba(59, 130, 246, 0.35);
          color: #1d4ed8;
          font-size: 0.76rem;
          font-weight: 800;
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
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          padding: 1rem 1.1rem;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
        }
        .invite-row-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
        }
        .invite-band {
          margin: 0;
          font-weight: 800;
          color: #0f172a;
        }
        .invite-band-link {
          text-decoration: none;
        }
        .invite-band-link:hover .invite-band {
          color: #1d4ed8;
          text-decoration: underline;
        }
        .invite-status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0.22rem 0.58rem;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          border: 1px solid rgba(148, 163, 184, 0.35);
          white-space: nowrap;
        }
        .invite-status-pending { background: rgba(250, 204, 21, 0.12); color: #f59e0b; }
        .invite-status-accepted { background: rgba(16, 185, 129, 0.12); color: #10b981; }
        .invite-status-rejected,
        .invite-status-cancelled { background: rgba(248, 113, 113, 0.12); color: #f87171; }
        .invite-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem 0.7rem;
          padding: 0.55rem 0.7rem;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #fff;
          color: #475569;
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
          margin: 0;
          white-space: pre-wrap;
          color: #1e293b;
          font-size: 0.88rem;
          line-height: 1.5;
          padding: 0.55rem 0.7rem;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #fff;
        }
        .invite-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.25rem;
          padding-top: 0.65rem;
          border-top: 1.5px solid #e2e8f0;
        }
        .invite-chat-panel {
          margin-top: 0.15rem;
        }
        .invite-chat-toggle {
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 800;
          color: #475569;
          list-style: none;
        }
        .invite-actions :global(.btn) {
          min-height: 36px;
          width: auto;
          justify-content: center;
          white-space: nowrap;
        }
        .invite-btn-danger {
          border-color: rgba(248, 113, 113, 0.45) !important;
          color: #f87171 !important;
          background: rgba(255, 255, 255, 0.02) !important;
          border-radius: 999px;
          padding-inline: 0.8rem;
        }
        .invite-btn-danger:hover:not(:disabled) {
          background: rgba(248, 113, 113, 0.12) !important;
          border-color: rgba(248, 113, 113, 0.65) !important;
        }
        .dash-links {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .dash-link {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.65rem 0.85rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #334155;
          font-weight: 700;
          font-size: 0.88rem;
          text-decoration: none;
          transition: all 0.2s;
        }
        .dash-link:hover {
          background: #eff6ff;
          border-color: #93c5fd;
          color: #1d4ed8;
        }
        .delete-section {
          border: 1.5px solid #fecaca;
          background: #fef2f2;
        }
        .btn-danger {
          background: #dc2626;
          border-color: #dc2626;
          color: #fff;
        }
        .btn-danger:hover {
          background: #b91c1c;
          border-color: #b91c1c;
        }
        .btn-danger:focus-visible {
          outline: 3px solid rgba(220, 38, 38, 0.35);
          outline-offset: 2px;
        }
        .delete-account-btn {
          width: fit-content;
          padding: 0.72rem 1.3rem;
          font-weight: 800;
          font-size: 0.92rem;
          border-radius: 999px;
          gap: 0.45rem;
          align-self: flex-start;
          background: #dc2626 !important;
          border-color: #dc2626 !important;
          color: #fff !important;
        }
        .danger-title {
          color: #dc2626 !important;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .delete-password-input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #fca5a5;
          border-radius: 12px;
          padding: 0.7rem 0.85rem;
          font-size: 0.93rem;
          color: #0f172a;
          outline: none;
        }
        .delete-password-input:focus {
          border-color: #dc2626;
          box-shadow: 0 0 0 4px rgba(220,38,38,0.12);
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
          .musician-editor-shell {
            padding-top: 8rem;
            padding-bottom: 4rem;
          }
          .profile-header h1 {
            font-size: 2rem;
          }
          .profile-wrap {
            max-width: 100%;
          }
          .profile-header {
            padding: 1.35rem;
            border-radius: 22px;
          }
          .musician-content,
          .panel-columns,
          .musician-layout,
          .kpi-grid,
          .grid,
          .media-grid,
          .musician-three-grid {
            grid-template-columns: 1fr;
          }
          .panel-hero {
            padding: 1.35rem;
            border-radius: 24px;
          }
          .profile-card {
            padding: 1rem;
            border-radius: 18px;
          }
          .panel-settings-btn {
            width: 100%;
            justify-content: center;
          }
          .profile-link-row {
            align-items: stretch;
          }
          .profile-link-row :global(.btn) {
            width: 100%;
            justify-content: center;
          }
          .invites-header-row { flex-direction: column; }
          .invite-search {
            width: 100%;
          }
          .invite-actions :global(.btn) {
            width: 100%;
          }
        }
        @media (max-width: 520px) {
          .musician-editor-shell {
            padding-top: 7.5rem;
          }
          .profile-header h1 {
            font-size: 1.5rem;
          }
          .musician-badge {
            width: 100%;
            justify-content: center;
            text-align: center;
          }
          .panel-card {
            min-height: 132px;
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
