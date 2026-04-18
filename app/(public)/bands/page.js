'use client';
import {
  Music,
  Play,
  Plus,
  Star,
  Bell,
  QrCode,
  Pencil,
  BookOpen,
  FileMusic,
  LayoutDashboard,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle,
  X,
  Download,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QrModal from '../../../components/QrModal';
import BookingCalendar from '../../../components/BookingCalendar';
import BusyDateNoteModal from '../../../components/bands/BusyDateNoteModal';
import ChatThread from '../../../components/ChatThread';
import { dateToCalendarKeyUTC } from '../../../lib/calendarDate';

/** Postavite na `false` da sakrijete kratke opise ispod dugmadi (brz „undo“ izgleda). */
const SHOW_HEADER_ACTION_HINTS = true;
const ACTIVE_INVITE_STATUSES = new Set(['PENDING', 'ACCEPTED']);

/** `1` ili prazno = jedan klik kao ranije; `0` = prozor za napomenu. */
const LS_CALENDAR_QUICK_BUSY = 'pronadjibend_calendar_quick_busy';

/** Sprečava pad cele tabele ako API vrati HTML grešku ili nevalidan JSON. */
async function safeResponseJson(res, fallback) {
  try {
    if (!res?.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

export default function BandDashboard() {
  const router = useRouter();
  const [bandId, setBandId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState([
    { label: 'Aktivne pesme', value: '0', icon: Music },
    { label: 'Novi Upiti', value: '0', icon: Bell },
    { label: 'Ocena', value: '0.0', icon: Star },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [busyDates, setBusyDates] = useState([]);
  /** Datumi ručno označeni kao zauzeti (BusyDate) — njih bend može ponovo osloboditi klikom */
  const [manualBusyKeys, setManualBusyKeys] = useState([]);
  /** Puni zapisi BusyDate (za napomene u tooltip-u i modalu) */
  const [busyDateRecords, setBusyDateRecords] = useState([]);
  /** true = staro ponašanje, jedan klik bez modala (čuva se u localStorage) */
  const [calendarQuickBusy, setCalendarQuickBusy] = useState(true);
  const [busyModal, setBusyModal] = useState({ open: false, mode: 'add', dateKey: null, loading: false });
  /** `{ id, op: 'patch' | 'delete' }` dok traje API poziv */
  const [bookingMutation, setBookingMutation] = useState(null);
  const [bookingActionError, setBookingActionError] = useState('');
  const [profileSavedNotice, setProfileSavedNotice] = useState(false);
  /** Prve 2 pesme za karticu „Digitalni Repertoar“ (iz baze, ne demo) */
  const [repertoirePreview, setRepertoirePreview] = useState([]);
  const [sentMusicianInvites, setSentMusicianInvites] = useState([]);
  const [inviteView, setInviteView] = useState('active');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('saved') !== '1') return;
    setProfileSavedNotice(true);
    router.replace('/bands', { scroll: false });
  }, [router]);

  useEffect(() => {
    if (!profileSavedNotice) return;
    const t = setTimeout(() => setProfileSavedNotice(false), 6000);
    return () => clearTimeout(t);
  }, [profileSavedNotice]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem(LS_CALENDAR_QUICK_BUSY) === '0') {
        setCalendarQuickBusy(false);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const applyCalendarData = useCallback((calData) => {
    setBusyDates(calData?.allBusy || []);
    setManualBusyKeys((calData?.busyDates || []).map((b) => dateToCalendarKeyUTC(b.date)));
    setBusyDateRecords(Array.isArray(calData?.busyDates) ? calData.busyDates : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchDashboardData = async () => {
      try {
        const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!meRes.ok) {
          router.replace('/login');
          return;
        }
        const meData = await meRes.json();
        if (meData?.user?.role === 'MUSICIAN') {
          router.replace('/muzicari/profil');
          return;
        }
        const id = meData?.user?.bandId;
        const isAdmin = meData?.user?.role === 'ADMIN';
        if (!id) {
          if (isAdmin) {
            if (!cancelled) {
              setIsAdminUser(true);
              setLoadError('');
              setIsLoading(false);
            }
            return;
          }
          if (!cancelled) {
            setIsAdminUser(false);
            setLoadError('Nalog nije povezan sa bend profilom.');
            setIsLoading(false);
          }
          return;
        }
        if (!cancelled) {
          setIsAdminUser(false);
          setBandId(id);
        }

        const [bookingsRes, bandRes, calendarRes, songsPreviewRes, musicianInvitesRes] = await Promise.all([
          fetch(`/api/bookings?bandId=${encodeURIComponent(id)}`),
          fetch(`/api/bands/${encodeURIComponent(id)}`),
          fetch(`/api/bands/calendar?bandId=${encodeURIComponent(id)}`),
          fetch(`/api/songs?bandId=${encodeURIComponent(id)}&limit=2`, { cache: 'no-store' }),
          fetch('/api/musicians/invites', { cache: 'no-store' }),
        ]);

        const bookingsData = await safeResponseJson(bookingsRes, []);
        const bandData = await safeResponseJson(bandRes, {});
        const calendarData = await safeResponseJson(calendarRes, {});
        const songsRaw = await safeResponseJson(songsPreviewRes, []);
        const musicianInvitesData = await safeResponseJson(musicianInvitesRes, { invites: [], mode: 'none' });
        const bookingsList = Array.isArray(bookingsData) ? bookingsData : [];
        const invitesList =
          musicianInvitesData?.mode === 'sent' && Array.isArray(musicianInvitesData?.invites)
            ? musicianInvitesData.invites
            : [];

        if (cancelled) return;
        setBookings(bookingsList);
        applyCalendarData(calendarData);
        setRepertoirePreview(Array.isArray(songsRaw) ? songsRaw : []);
        setSentMusicianInvites(invitesList);
        setStats([
          { label: 'Digitalni Repertoar', value: String(bandData._count?.songs ?? 0), icon: Music },
          { label: 'Novi Upiti', value: bookingsList.filter(b => b.status === 'PENDING').length, icon: Bell },
          { label: 'Vaša Ocena', value: bandData.rating != null ? bandData.rating.toFixed(1) : '—', icon: Star },
        ]);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        if (!cancelled) setLoadError('Ne možemo učitati podatke. Pokušajte ponovo.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchDashboardData();
    return () => {
      cancelled = true;
    };
  }, [router, applyCalendarData]);

  const refreshDashboardBookings = async (id) => {
    if (!id) return;
    const [bookingsRes, calendarRes] = await Promise.all([
      fetch(`/api/bookings?bandId=${encodeURIComponent(id)}`, { cache: 'no-store' }),
      fetch(`/api/bands/calendar?bandId=${encodeURIComponent(id)}`, { cache: 'no-store' }),
    ]);
    const bookingsData = await safeResponseJson(bookingsRes, []);
    const calendarData = await safeResponseJson(calendarRes, {});
    const list = Array.isArray(bookingsData) ? bookingsData : [];
    setBookings(list);
    applyCalendarData(calendarData);
    setStats((prev) =>
      prev.map((stat) =>
        stat.label === 'Novi Upiti'
          ? { ...stat, value: String(list.filter((b) => b.status === 'PENDING').length) }
          : stat
      )
    );
  };

  const patchBooking = async (bookingId, action) => {
    if (!bandId || !bookingId) return;
    setBookingActionError('');
    setBookingMutation({ id: bookingId, op: 'patch' });
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Akcija nije uspela.');
      await refreshDashboardBookings(bandId);
    } catch (e) {
      setBookingActionError(e.message || 'Greška.');
    } finally {
      setBookingMutation(null);
    }
  };

  const deleteBooking = async (bookingId) => {
    if (!bandId || !bookingId) return;
    if (!window.confirm('Da li ste sigurni da želite da obrišete ovu rezervaciju? Ova radnja se ne može poništiti.')) {
      return;
    }
    setBookingActionError('');
    setBookingMutation({ id: bookingId, op: 'delete' });
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Brisanje nije uspelo.');
      await refreshDashboardBookings(bandId);
    } catch (e) {
      setBookingActionError(e.message || 'Greška pri brisanju.');
    } finally {
      setBookingMutation(null);
    }
  };

  const refreshCalendarOnly = useCallback(async () => {
    if (!bandId) return;
    const calRes = await fetch(`/api/bands/calendar?bandId=${encodeURIComponent(bandId)}`, {
      cache: 'no-store',
    });
    const calData = await calRes.json();
    applyCalendarData(calData);
  }, [bandId, applyCalendarData]);

  /** TOGGLE: bez reason pri brzom režimu; sa reason pri kreiranju iz modala */
  const calendarToggleRequest = useCallback(
    async (date, reason) => {
      if (!bandId) return { ok: false };
      const payload = { bandId, date, action: 'TOGGLE' };
      if (reason !== undefined) payload.reason = reason;
      const resp = await fetch('/api/bands/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) {
        console.error(data?.error || 'Kalendar');
        return { ok: false, error: data?.error };
      }
      await refreshCalendarOnly();
      return { ok: true };
    },
    [bandId, refreshCalendarOnly],
  );

  const calendarUpdateNoteRequest = useCallback(
    async (date, reason) => {
      if (!bandId) return { ok: false };
      const resp = await fetch('/api/bands/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId, date, action: 'UPDATE_NOTE', reason }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        console.error(data?.error || 'Kalendar');
        return { ok: false, error: data?.error };
      }
      await refreshCalendarOnly();
      return { ok: true };
    },
    [bandId, refreshCalendarOnly],
  );

  const handleToggleBusy = async (date) => {
    await calendarToggleRequest(date, undefined);
  };

  const busyReasonByKey = useMemo(() => {
    const m = {};
    for (const b of busyDateRecords) {
      m[dateToCalendarKeyUTC(b.date)] = b.reason || '';
    }
    return m;
  }, [busyDateRecords]);

  const handleCalendarDayClick = (date) => {
    if (!bandId || !date) return;
    if (calendarQuickBusy) {
      handleToggleBusy(date);
      return;
    }
    const isManual = manualBusyKeys.includes(date);
    setBusyModal({ open: true, mode: isManual ? 'edit' : 'add', dateKey: date, loading: false });
  };

  const setCalendarQuickBusyPersist = (value) => {
    setCalendarQuickBusy(value);
    try {
      localStorage.setItem(LS_CALENDAR_QUICK_BUSY, value ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const formatBusyModalDate = (key) => {
    if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return key || '';
    const [y, mo, d] = key.split('-').map(Number);
    const dt = new Date(y, mo - 1, d);
    try {
      return dt.toLocaleDateString('sr-Latn-RS', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return key;
    }
  };

  const closeBusyModal = () => {
    if (busyModal.loading) return;
    setBusyModal({ open: false, mode: 'add', dateKey: null, loading: false });
  };

  const handleBusyModalSave = async (note) => {
    const { dateKey, mode } = busyModal;
    if (!dateKey) return;
    setBusyModal((s) => ({ ...s, loading: true }));
    try {
      let ok = true;
      if (mode === 'add') {
        const r = await calendarToggleRequest(dateKey, note);
        ok = r.ok;
      } else {
        const r = await calendarUpdateNoteRequest(dateKey, note);
        ok = r.ok;
      }
      if (ok) setBusyModal({ open: false, mode: 'add', dateKey: null, loading: false });
      else setBusyModal((s) => ({ ...s, loading: false }));
    } catch {
      setBusyModal((s) => ({ ...s, loading: false }));
    }
  };

  const handleBusyModalRemove = async () => {
    const { dateKey } = busyModal;
    if (!dateKey) return;
    setBusyModal((s) => ({ ...s, loading: true }));
    try {
      const r = await calendarToggleRequest(dateKey, undefined);
      if (r.ok) setBusyModal({ open: false, mode: 'add', dateKey: null, loading: false });
      else setBusyModal((s) => ({ ...s, loading: false }));
    } catch {
      setBusyModal((s) => ({ ...s, loading: false }));
    }
  };

  const simulateRequest = () => {
    setActiveRequest({
      song: 'Kada padne noć',
      table: '7',
      time: 'upravo sada'
    });
    setTimeout(() => setActiveRequest(null), 10000);
  };

  if (isLoading) return <div className="loading">Učitavanje...</div>;

  if (loadError) {
    return (
      <div className="dashboard-container container" style={{ paddingTop: '10rem' }}>
        <p className="text-muted">{loadError}</p>
        <Link href="/muzicari/profil" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
          Podešavanje profila
        </Link>
      </div>
    );
  }

  if (isAdminUser && !bandId) {
    return (
      <div className="dashboard-container container" style={{ paddingTop: '8rem' }}>
        <div className="blob" style={{ top: '10%', left: '10%' }}></div>
        <header className="dash-header">
          <div>
            <h1>Portal za muzičare</h1>
            <p className="text-muted">
              Ulogovani ste kao administrator. Ovde možete koristiti alate bez bend naloga; kontrolna tabla benda zahteva povezan bend profil.
            </p>
          </div>
        </header>
        <div className="stats-grid" style={{ marginTop: '2rem' }}>
          <Link href="/admin" className="glass-card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="stat-icon-box">
              <LayoutDashboard size={20} color="var(--accent-primary)" />
            </div>
            <div className="stat-info">
              <span className="stat-value">Admin</span>
              <span className="stat-label">Upravljanje sajtom</span>
            </div>
          </Link>
          <Link href="/bands/midi" className="glass-card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="stat-icon-box">
              <FileMusic size={20} color="var(--accent-primary)" />
            </div>
            <div className="stat-info">
              <span className="stat-value">MIDI</span>
              <span className="stat-label">Biblioteka i upload</span>
            </div>
          </Link>
          <Link href="/bands/pesmarica" className="glass-card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="stat-icon-box">
              <BookOpen size={20} color="var(--accent-primary)" />
            </div>
            <div className="stat-info">
              <span className="stat-value">Pesmarica</span>
              <span className="stat-label">Pregled pesama</span>
            </div>
          </Link>
          <Link href="/clients" className="glass-card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="stat-icon-box">
              <Music size={20} color="var(--accent-primary)" />
            </div>
            <div className="stat-info">
              <span className="stat-value">Bendovi</span>
              <span className="stat-label">Javna pretraga</span>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  if (!bandId) {
    return <div className="loading">Učitavanje...</div>;
  }

  const visibleMusicianInvites = sentMusicianInvites.filter((invite) => {
    const status = String(invite?.status || '').toUpperCase();
    return inviteView === 'archive' ? !ACTIVE_INVITE_STATUSES.has(status) : ACTIVE_INVITE_STATUSES.has(status);
  });

  const activeInviteCount = sentMusicianInvites.filter((invite) =>
    ACTIVE_INVITE_STATUSES.has(String(invite?.status || '').toUpperCase())
  ).length;

  const archivedInviteCount = sentMusicianInvites.filter((invite) =>
    !ACTIVE_INVITE_STATUSES.has(String(invite?.status || '').toUpperCase())
  ).length;

  return (
    <div className="dashboard-container container">
      {profileSavedNotice && (
        <div
          role="status"
          className="profile-saved-toast"
          style={{
            marginBottom: '1rem',
            padding: '0.85rem 1rem',
            borderRadius: 14,
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#047857',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={22} aria-hidden />
            Profil je uspešno sačuvan.
          </span>
          <button
            type="button"
            onClick={() => setProfileSavedNotice(false)}
            aria-label="Zatvori obaveštenje"
            style={{
              background: 'transparent',
              border: 'none',
              padding: 4,
              cursor: 'pointer',
              color: '#047857',
              borderRadius: 8,
              lineHeight: 1,
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>
      )}
      <div className="blob" style={{ top: '10%', left: '10%' }}></div>
      
      <header className="dash-header">
        <div>
          <h1>Kontrolna Tabla</h1>
          <p className="text-muted">Dobrodošli nazad. Imate {(Array.isArray(bookings) ? bookings : []).filter(b => b.status === 'PENDING').length} novih upita.</p>
        </div>
        <div className="header-actions">
          <div className="header-action-item">
            <Link href="/bands/live">
              <button type="button" className="btn btn-primary">
                <Play size={18} style={{ marginRight: '8px' }} /> Pokreni Nastup
              </button>
            </Link>
            {SHOW_HEADER_ACTION_HINTS && (
              <span className="action-caption action-caption-primary">Live zahtevi pesama</span>
            )}
          </div>
          <div className="header-action-item">
            <Link href="/bands/pesmarica">
              <button type="button" className="btn btn-secondary">
                <BookOpen size={18} style={{ marginRight: '8px' }} /> Pesmarica
              </button>
            </Link>
            {SHOW_HEADER_ACTION_HINTS && (
              <span className="action-caption">Tekstovi i akordi za setlistu</span>
            )}
          </div>
          <div className="header-action-item">
            <Link href="/bands/midi">
              <button type="button" className="btn btn-secondary">
                <FileMusic size={18} style={{ marginRight: '8px' }} /> MIDI Fajlovi
              </button>
            </Link>
            {SHOW_HEADER_ACTION_HINTS && (
              <span className="action-caption">Biblioteka i upload MIDI fajlova</span>
            )}
          </div>
          <div className="header-action-item">
            <button type="button" className="btn btn-secondary" onClick={() => setShowQr(true)}>
              <QrCode size={18} style={{ marginRight: '8px' }} /> Vaš QR Kod
            </button>
            {SHOW_HEADER_ACTION_HINTS && (
              <span className="action-caption">QR za goste — brz pristup linku</span>
            )}
          </div>
          <div className="header-action-item">
            <a
              href={`/api/bands/${encodeURIComponent(bandId)}/marketing-poster`}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
            >
              <Download size={18} style={{ marginRight: '8px' }} /> Poster za štampu (A4, 300 DPI)
            </a>
            {SHOW_HEADER_ACTION_HINTS && (
              <span className="action-caption">Tvoj QR za goste — live pesmarica i narudžbine</span>
            )}
          </div>
          <div className="header-action-item">
            <Link href="/bands/profile">
              <button type="button" className="btn btn-secondary">
                <Pencil size={18} style={{ marginRight: '8px' }} /> Moj Profil
              </button>
            </Link>
            {SHOW_HEADER_ACTION_HINTS && (
              <span className="action-caption">Javni profil, slike, video i opis</span>
            )}
          </div>
        </div>
      </header>

      {/* Live Request Notification Overlay */}
      {activeRequest && (
        <div className="live-notification glass-card animate-slide-in">
          <div className="notif-header">
            <div className="pulse-dot"></div>
            <span className="notif-title">NOVI ZAHTEV</span>
            <span className="notif-time">{activeRequest.time}</span>
          </div>
          <div className="notif-body">
            <p className="notif-song">{activeRequest.song}</p>
            <p className="notif-table">Sto broj: <span className="highlight">{activeRequest.table}</span></p>
          </div>
          <div className="notif-actions">
            <button className="btn btn-sm btn-secondary" onClick={() => setActiveRequest(null)}>Odbij</button>
            <button className="btn btn-sm btn-primary" onClick={() => setActiveRequest(null)}>Sviraj!</button>
          </div>
        </div>
      )}

      {showQr && <QrModal bandId={bandId} onClose={() => setShowQr(false)} />}

      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className="glass-card stat-card">
            <div className="stat-icon-box">
              <stat.icon size={20} color="var(--accent-primary)" />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-content">
        <section className="repertoire-preview glass-card">
          <div className="section-header">
            <h3>Digitalni Repertoar</h3>
            <Link href="/bands/repertoire" className="btn btn-secondary btn-sm">Vidi sve</Link>
          </div>
          <div className="song-list">
            {repertoirePreview.length === 0 ? (
              <p className="repertoire-preview-empty text-muted">
                Još nema pesama u repertoaru — dodajte ih na stranici Repertoar.
              </p>
            ) : (
              repertoirePreview.map((song) => (
                <div key={song.id} className="song-item">
                  <div>
                    <p className="song-title">{song.title}</p>
                    <p className="song-artist text-muted">{song.artist}</p>
                  </div>
                  <span className="tonality-badge" title="Originalni ton">
                    {song.key?.trim() ? song.key : '—'}
                  </span>
                </div>
              ))
            )}
            <Link href="/bands/repertoire" style={{ width: '100%' }}>
              <button className="btn btn-secondary btn-full" type="button">
                <Plus size={18} /> Dodaj pesmu
              </button>
            </Link>
          </div>
        </section>

        <section className="upcoming-bookings glass-card">
          <h3>Predstojeći Upiti & Rezervacije</h3>
          {bookingActionError ? (
            <p className="booking-action-error" role="alert">
              {bookingActionError}
            </p>
          ) : null}
          <div className="booking-list">
            {bookings.length > 0 ? bookings.map(booking => {
              const bDate = new Date(booking.date);
              const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAJ', 'JUN', 'JUL', 'AVG', 'SEP', 'OKT', 'NOV', 'DEC'];
              const isConfirmed = booking.status === 'CONFIRMED';
              const busy = bookingMutation?.id === booking.id;
              const busyPatch = busy && bookingMutation?.op === 'patch';
              const busyDelete = busy && bookingMutation?.op === 'delete';
              const canPrihvati =
                booking.status === 'PENDING' || booking.status === 'CONFIRMED';
              const canOdbij = ['PENDING', 'BAND_ACCEPTED', 'CONFIRMED'].includes(booking.status);
              return (
                <div key={booking.id} className="booking-item">
                  <div className="booking-item-row">
                    <div className="date-box">
                      <span className="month">{months[bDate.getMonth()]}</span>
                      <span className="day">{bDate.getDate()}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="venue">{booking.location || 'Privatna proslava'}</p>
                      <p className="status text-muted">
                        {booking.status === 'PENDING'
                          ? 'Novo • '
                          : booking.status === 'BAND_ACCEPTED'
                            ? 'Prihvaćeno od benda • čeka administraciju • '
                            : booking.status === 'CONFIRMED'
                              ? 'Potvrđeno od administracije • '
                              : booking.status === 'COMPLETED'
                                ? 'Završeno • '
                                : booking.status === 'CANCELLED'
                                  ? 'Otkazano • '
                                  : `${booking.status} • `}
                        {booking.clientName}
                      </p>
                      {booking.status === 'PENDING' && (
                        <p className="booking-hint text-muted">
                          Poruka i kontakt klijenta vide se ovde nakon admin potvrde.
                        </p>
                      )}
                      {booking.status === 'BAND_ACCEPTED' && (
                        <p className="booking-hint text-muted">
                          Poruka i kontakt klijenta biće vidljivi kada administrator potvrdi rezervaciju.
                        </p>
                      )}
                    </div>
                  </div>
                  {isConfirmed && (
                    <div className="booking-confirmed-block">
                      <p className="booking-confirmed-label">
                        <MessageSquare size={14} /> Poruka klijenta
                      </p>
                      {booking.message ? (
                        <p className="booking-message">{booking.message}</p>
                      ) : (
                        <p className="booking-message muted">Bez dodatne poruke.</p>
                      )}
                      <div className="booking-contact-row">
                        {booking.clientEmail ? (
                          <a href={`mailto:${booking.clientEmail}`} className="booking-contact-link">
                            <Mail size={14} /> {booking.clientEmail}
                          </a>
                        ) : null}
                        {booking.clientPhone ? (
                          <a href={`tel:${String(booking.clientPhone).replace(/\s/g, '')}`} className="booking-contact-link">
                            <Phone size={14} /> {booking.clientPhone}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  )}
                  <div className="booking-item-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={!canPrihvati || busy}
                      title={
                        booking.status === 'BAND_ACCEPTED'
                          ? 'Već ste prihvatili upit — čeka se potvrda administratora.'
                          : booking.status === 'COMPLETED' || booking.status === 'CANCELLED'
                            ? 'Nije dostupno u ovom statusu.'
                            : booking.status === 'CONFIRMED'
                              ? 'Označava rezervaciju kao završenu (održan nastup).'
                              : 'Prihvata novi upit.'
                      }
                      onClick={() => {
                        if (booking.status === 'PENDING') patchBooking(booking.id, 'accept');
                        else if (booking.status === 'CONFIRMED') patchBooking(booking.id, 'complete');
                      }}
                    >
                      {busyPatch ? 'Čuvanje...' : 'Prihvati'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      disabled={!canOdbij || busy}
                      title="Otkazuje rezervaciju (status: otkazano)."
                      onClick={() => patchBooking(booking.id, 'reject')}
                    >
                      {busyPatch ? 'Čuvanje...' : 'Odbij'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary booking-btn-danger"
                      disabled={busy}
                      title="Trajno briše rezervaciju sa liste."
                      onClick={() => deleteBooking(booking.id)}
                    >
                      {busyDelete ? 'Brisanje...' : 'Obriši'}
                    </button>
                  </div>
                </div>
              );
            }) : (
              <div className="no-bookings">Trenutno nemate novih upita.</div>
            )}
          </div>
        </section>

        <section className="calendar-management glass-card">
          <h3>Kalendar Zauzetosti</h3>
          <p className="text-muted calendar-hint-p">
            {calendarQuickBusy
              ? 'Kliknite na datum da ga označite kao zauzet ili slobodan (jedan klik).'
              : 'Kliknite na datum da dodate zauzeće i napomenu.'}
          </p>
          <label className="calendar-quick-row" htmlFor="calendar-quick-busy-cb">
            <input
              id="calendar-quick-busy-cb"
              type="checkbox"
              checked={calendarQuickBusy}
              onChange={(e) => setCalendarQuickBusyPersist(e.target.checked)}
            />
            <span>Označi bez dodatnog komentara</span>
          </label>
          <BookingCalendar
            bandId={bandId}
            busyDates={busyDates}
            manualBusyDateKeys={manualBusyKeys}
            busyReasonByKey={busyReasonByKey}
            onDateSelect={handleCalendarDayClick}
          />
          <BusyDateNoteModal
            open={busyModal.open}
            mode={busyModal.mode}
            dateLabel={busyModal.dateKey ? formatBusyModalDate(busyModal.dateKey) : ''}
            initialNote={busyModal.dateKey ? busyReasonByKey[busyModal.dateKey] || '' : ''}
            loading={busyModal.loading}
            onClose={closeBusyModal}
            onSave={handleBusyModalSave}
            onRemove={busyModal.mode === 'edit' ? handleBusyModalRemove : undefined}
          />
        </section>

        <section className="musician-invites glass-card">
          <div className="section-header">
            <h3>Pozivi muzičarima</h3>
            <Link href="/muzicari" className="btn btn-secondary btn-sm">Pronađi muzičare</Link>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
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
          <div className="booking-list">
            {visibleMusicianInvites.length > 0 ? (
              visibleMusicianInvites.slice(0, 12).map((invite) => (
                <div key={invite.id} className="booking-item">
                  <div className="booking-item-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="venue">{invite.musician?.name || 'Muzičar'}</p>
                      <p className="status text-muted">
                        {invite.musician?.primaryInstrument || 'Instrument'}
                        {invite.musician?.city ? ` • ${invite.musician.city}` : ''}
                      </p>
                      {invite.message ? <p className="booking-hint text-muted">{invite.message}</p> : null}
                    </div>
                    <span className={`invite-status-pill invite-status-${String(invite.status || '').toLowerCase()}`}>
                      {invite.status}
                    </span>
                  </div>
                  <details className="invite-chat-panel">
                    <summary className="invite-chat-toggle">Poruke</summary>
                    <ChatThread inviteId={invite.id} />
                  </details>
                </div>
              ))
            ) : (
              <div className="no-bookings">
                {inviteView === 'archive' ? 'Nema arhiviranih poziva muzičarima.' : 'Još nema aktivnih poziva muzičarima.'}
              </div>
            )}
          </div>
        </section>
      </div>

      <style jsx>{`
        .dashboard-container { padding-top: 10rem; padding-bottom: 6rem; min-height: 100vh; }
        .dash-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          margin-bottom: 5rem;
          flex-wrap: wrap;
          gap: 1.5rem;
        }
        .dash-header h1 { font-size: 3rem; font-weight: 800; letter-spacing: -2px; }

        .stats-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); 
          gap: 2rem; 
          margin-bottom: 4rem;
        }
        .stat-card { display: flex; align-items: center; gap: 1.5rem; border: 1px solid var(--border); }
        .stat-icon-box { background: rgba(16, 185, 129, 0.05); width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .stat-value { display: block; font-size: 2rem; font-weight: 800; line-height: 1; margin-bottom: 4px; }
        .stat-label { font-size: 0.75rem; color: #555; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }
        
        .dash-content { 
          display: grid; 
          grid-template-columns: 1.5fr 1fr; 
          gap: 3rem; 
        }
        .repertoire-preview, .upcoming-bookings, .calendar-management { padding: 2rem; border: 1px solid var(--border); }
        .musician-invites { padding: 2rem; border: 1px solid var(--border); }
        .calendar-hint-p { margin-bottom: 0.75rem; font-size: 0.85rem; line-height: 1.45; }
        .calendar-quick-row {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          margin-bottom: 1.25rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          user-select: none;
        }
        .calendar-quick-row input {
          margin-top: 0.2rem;
          width: 1rem;
          height: 1rem;
          accent-color: var(--accent-primary, #007aff);
          flex-shrink: 0;
        }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .section-header h3 { font-size: 1.35rem; }
        .booking-action-error {
          color: #f87171;
          font-size: 0.88rem;
          font-weight: 600;
          margin: 0 0 1rem;
        }
        
        .song-list, .booking-list { display: flex; flex-direction: column; gap: 1.25rem; }
        .repertoire-preview-empty {
          margin: 0;
          padding: 0.35rem 0 0.5rem;
          font-size: 0.92rem;
          line-height: 1.45;
        }

        .song-item { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          padding: 1.5rem;
          background: rgba(255,255,255,0.01);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }
        .booking-item {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 1rem;
          padding: 1.5rem;
          background: rgba(255,255,255,0.01);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }
        .invite-chat-panel {
          margin-top: 0.15rem;
        }
        .invite-chat-toggle {
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 800;
          color: var(--text-muted, #94a3b8);
          list-style: none;
        }
        .invite-chat-toggle::-webkit-details-marker {
          display: none;
        }
        .booking-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .booking-hint {
          font-size: 0.78rem;
          margin-top: 0.45rem;
          margin-bottom: 0;
          line-height: 1.35;
        }
        .booking-confirmed-block {
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }
        .booking-confirmed-label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--accent-primary);
          margin: 0 0 0.5rem;
        }
        .booking-message {
          margin: 0 0 0.75rem;
          white-space: pre-wrap;
          font-size: 0.92rem;
          line-height: 1.45;
          color: var(--text, #e2e8f0);
        }
        .booking-message.muted {
          color: var(--text-muted);
          font-style: italic;
        }
        .booking-contact-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem 1rem;
        }
        .booking-contact-link {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--accent-primary);
          text-decoration: none;
        }
        .booking-contact-link:hover { text-decoration: underline; }
        .booking-item-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          padding-top: 1rem;
          margin-top: 0.25rem;
          border-top: 1px solid var(--border);
        }
        .booking-item-actions :global(.btn) { min-height: 40px; }
        .invite-status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0.25rem 0.6rem;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          border: 1px solid rgba(148, 163, 184, 0.35);
        }
        .invite-status-pending { background: rgba(250, 204, 21, 0.12); color: #f59e0b; }
        .invite-status-accepted { background: rgba(16, 185, 129, 0.12); color: #10b981; }
        .invite-status-rejected,
        .invite-status-cancelled { background: rgba(248, 113, 113, 0.12); color: #f87171; }
        .booking-btn-danger {
          border-color: rgba(248, 113, 113, 0.45) !important;
          color: #f87171 !important;
        }
        .booking-btn-danger:hover:not(:disabled) {
          background: rgba(248, 113, 113, 0.12) !important;
        }
        .song-title { font-weight: 700; font-size: 1.1rem; }
        .tonality-badge { 
          padding: 4px 12px; 
          background: var(--accent-primary); 
          color: #000;
          font-size: 0.7rem; 
          font-weight: 800;
          border-radius: 4px;
        }
        
        .date-box { 
          width: 54px; 
          height: 54px; 
          background: rgba(255,255,255,0.03); 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          border-radius: 10px;
          border: 1px solid var(--border);
          margin-right: 1.5rem;
        }
        .month { font-size: 0.65rem; color: var(--accent-primary); font-weight: 800; letter-spacing: 1px; }
        .day { font-size: 1.25rem; font-weight: 900; }
        .venue { font-weight: 700; font-size: 1.1rem; }
        
        .btn-full { width: 100%; margin-top: 1.5rem; gap: 0.5rem; height: 50px; }
        
        @media (max-width: 968px) {
          .dash-content { grid-template-columns: 1fr; }
          .dash-header h1 { font-size: 2.5rem; }
          .dash-header {
            flex-direction: column;
            align-items: stretch;
            margin-bottom: 3rem;
          }
        }

        .header-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.85rem 1rem;
          align-items: flex-start;
          justify-content: flex-end;
          max-width: 100%;
        }
        .header-action-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          min-width: 0;
          flex: 0 1 auto;
        }
        .header-action-item :global(a) {
          display: block;
          width: 100%;
          text-decoration: none;
        }
        .header-action-item :global(.btn) {
          width: 100%;
          justify-content: center;
          white-space: nowrap;
          min-height: 46px;
        }
        .action-caption {
          font-size: 0.68rem;
          line-height: 1.3;
          color: var(--text-muted, #64748b);
          text-align: center;
          max-width: 10.5rem;
          font-weight: 500;
          letter-spacing: 0.02em;
        }
        .action-caption-primary {
          color: var(--text-muted, #64748b);
          opacity: 0.95;
        }
        @media (max-width: 968px) {
          .header-actions {
            justify-content: stretch;
            width: 100%;
          }
          .header-action-item {
            flex: 1 1 calc(50% - 0.5rem);
            min-width: 0;
          }
          .header-action-item :global(.btn) {
            min-height: 48px;
          }
        }
        @media (max-width: 520px) {
          .dashboard-container { padding-top: 7.5rem; }
          .header-action-item {
            flex: 1 1 100%;
          }
          .header-action-item :global(.btn) {
            white-space: normal;
            text-align: center;
            font-size: 0.82rem;
            min-height: 48px;
            line-height: 1.3;
          }
          .action-caption {
            font-size: 0.64rem;
          }
        }
        .live-notification { 
          position: fixed; top: 100px; right: 2rem; width: 340px; max-width: calc(100vw - 2rem);
          z-index: 1500; padding: 2rem; border-top: 2px solid var(--accent-primary);
        }
        @media (max-width: 480px) {
          .live-notification { right: 1rem; left: 1rem; width: auto; }
        }
        .notif-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
        .pulse-dot { width: 8px; height: 8px; background: #ef4444; border-radius: 50%; animation: pulse 1s infinite; }
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }
        
        .notif-title { font-weight: 900; font-size: 0.7rem; letter-spacing: 2px; flex: 1; color: #ef4444; }
        .notif-time { font-size: 0.7rem; color: var(--text-muted); }
        .notif-song { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; color: #fff; }
        .notif-table { font-weight: 600; font-size: 0.95rem; margin-bottom: 2rem; color: var(--text-muted); }
        .highlight { color: #fff; font-weight: 800; }
        .notif-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
      `}</style>
    </div>
  );
}
