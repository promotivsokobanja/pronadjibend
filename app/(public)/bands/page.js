'use client';
import { Music, Play, Plus, Star, Bell, QrCode, Pencil, BookOpen, FileMusic, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QrModal from '../../../components/QrModal';
import BookingCalendar from '../../../components/BookingCalendar';

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

        const [bookingsRes, bandRes, calendarRes] = await Promise.all([
          fetch(`/api/bookings?bandId=${encodeURIComponent(id)}`),
          fetch(`/api/bands/${encodeURIComponent(id)}`),
          fetch(`/api/bands/calendar?bandId=${encodeURIComponent(id)}`)
        ]);

        const bookingsData = await bookingsRes.json();
        const bandData = await bandRes.json();
        const calendarData = await calendarRes.json();
        const bookingsList = Array.isArray(bookingsData) ? bookingsData : [];

        if (cancelled) return;
        setBookings(bookingsList);
        setBusyDates(calendarData.allBusy || []);
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
  }, [router]);

  const handleToggleBusy = async (date) => {
    if (!bandId) return;
    try {
      const resp = await fetch('/api/bands/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId, date, action: 'TOGGLE' })
      });
      const data = await resp.json();
      if (data.isBusy) {
        setBusyDates((prev) => [...prev, date]);
      } else {
        setBusyDates((prev) => prev.filter((d) => d !== date));
      }
    } catch (err) {
      console.error(err);
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
        <Link href="/bands/profile" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
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

  return (
    <div className="dashboard-container container">
      <div className="blob" style={{ top: '10%', left: '10%' }}></div>
      
      <header className="dash-header">
        <div>
          <h1>Kontrolna Tabla</h1>
          <p className="text-muted">Dobrodošli nazad. Imate {(Array.isArray(bookings) ? bookings : []).filter(b => b.status === 'PENDING').length} novih upita.</p>
        </div>
        <div className="header-actions">
          <Link href="/bands/profile">
            <button className="btn btn-secondary">
              <Pencil size={18} style={{ marginRight: '8px' }} /> Moj Profil
            </button>
          </Link>
          <button className="btn btn-secondary" onClick={() => setShowQr(true)}>
            <QrCode size={18} style={{ marginRight: '8px' }} /> Vaš QR Kod
          </button>
          <Link href="/bands/pesmarica">
            <button className="btn btn-secondary">
              <BookOpen size={18} style={{ marginRight: '8px' }} /> Pesmarica
            </button>
          </Link>
          <Link href="/bands/midi">
            <button className="btn btn-secondary">
              <FileMusic size={18} style={{ marginRight: '8px' }} /> MIDI Fajlovi
            </button>
          </Link>
          <Link href="/bands/live">
            <button className="btn btn-primary">
              <Play size={18} style={{ marginRight: '8px' }} /> Pokreni Nastup
            </button>
          </Link>
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
            <div className="song-item">
              <div>
                <p className="song-title">Lutka</p>
                <p className="song-artist text-muted">S.A.R.S.</p>
              </div>
              <span className="tonality-badge">G dur</span>
            </div>
            <div className="song-item">
              <div>
                <p className="song-title">Perspektiva</p>
                <p className="song-artist text-muted">S.A.R.S.</p>
              </div>
              <span className="tonality-badge">E mol</span>
            </div>
            <Link href="/bands/repertoire" style={{ width: '100%' }}>
              <button className="btn btn-secondary btn-full">
                <Plus size={18} /> Dodaj pesmu
              </button>
            </Link>
          </div>
        </section>

        <section className="upcoming-bookings glass-card">
          <h3>Predstojeći Upiti & Rezervacije</h3>
          <div className="booking-list">
            {bookings.length > 0 ? bookings.map(booking => {
              const bDate = new Date(booking.date);
              const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAJ', 'JUN', 'JUL', 'AVG', 'SEP', 'OKT', 'NOV', 'DEC'];
              return (
                <div key={booking.id} className="booking-item">
                  <div className="date-box">
                    <span className="month">{months[bDate.getMonth()]}</span>
                    <span className="day">{bDate.getDate()}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className="venue">{booking.location || 'Privatna proslava'}</p>
                    <p className="status text-muted">
                      {booking.status === 'PENDING' ? 'Novo • ' : 'Potvrđeno • '}
                      {booking.clientName}
                    </p>
                  </div>
                  <div className="booking-actions">
                    {booking.status === 'PENDING' && (
                      <button className="btn btn-sm btn-primary">Prihvati</button>
                    )}
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
          <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>Kliknite na datum da ga označite kao zauzet ili slobodan.</p>
          <BookingCalendar 
            bandId={bandId}
            busyDates={busyDates}
            onDateSelect={handleToggleBusy}
          />
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
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .section-header h3 { font-size: 1.35rem; }
        
        .song-list, .booking-list { display: flex; flex-direction: column; gap: 1.25rem; }
        
        .song-item, .booking-item { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          padding: 1.5rem;
          background: rgba(255,255,255,0.01);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
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
          gap: 0.75rem;
          align-items: stretch;
          justify-content: flex-end;
          max-width: 100%;
        }
        @media (max-width: 968px) {
          .header-actions {
            justify-content: stretch;
            width: 100%;
          }
          .header-actions :global(a) {
            flex: 1 1 calc(50% - 0.375rem);
            min-width: 0;
            display: flex;
          }
          .header-actions :global(button) {
            width: 100%;
            min-height: 48px;
            justify-content: center;
          }
        }
        @media (max-width: 520px) {
          .dashboard-container { padding-top: 7.5rem; }
          .header-actions :global(a) {
            flex: 1 1 100%;
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
