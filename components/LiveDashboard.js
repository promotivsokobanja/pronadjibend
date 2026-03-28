'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, ListMusic, Eye, EyeOff, MessageSquare, Music, Clock, Settings, ArrowLeft, X, Volume2, VolumeX, Zap, ZapOff, Type, RotateCcw, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LiveDashboard({ bandId }) {
  const router = useRouter();
  const [isNightMode, setIsNightMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('requests');
  const [requestView, setRequestView] = useState('active');

  // Song cheatsheet state
  const [allSongs, setAllSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [songSearch, setSongSearch] = useState('');
  const [songLoading, setSongLoading] = useState(false);
  const [showSongDropdown, setShowSongDropdown] = useState(false);
  const lyricsRef = useRef(null);
  const songComboRef = useRef(null);

  // Settings state
  const [settings, setSettings] = useState({
    venueName: 'Kafana "Druga kuća"',
    maxRequests: 10,
    showTips: true,
    soundEnabled: true,
    autoAccept: false,
    fontSize: 100, // percentage
  });

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSession = () => {
    if (confirm('Da li ste sigurni da želite da resetujete sesiju? Svi zahtevi će biti obrisani.')) {
      setRequests([]);
    }
  };

  const fontScale = settings.fontSize / 100;
  const prevPendingCountRef = useRef(0);

  // Poll live requests from database
  const fetchRequests = useCallback(async () => {
    if (!bandId) return;
    try {
      const resp = await fetch(`/api/live-requests?bandId=${encodeURIComponent(bandId)}`, { cache: 'no-store' });
      if (!resp.ok) return;
      const data = await resp.json();
      if (Array.isArray(data)) {
        setRequests(data);
      }
    } catch (err) {
      console.error('Error fetching live requests:', err);
    }
  }, [bandId]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 4000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  // Fetch songs for this band (Live mode mora znati bandId iz prijave)
  useEffect(() => {
    if (!bandId) {
      setAllSongs([]);
      setSongLoading(false);
      return;
    }
    const fetchSongs = async () => {
      setSongLoading(true);
      try {
        const resp = await fetch(`/api/songs?bandId=${encodeURIComponent(bandId)}`, {
          cache: 'no-store',
        });
        const data = await resp.json();
        setAllSongs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching songs:', err);
        setAllSongs([]);
      } finally {
        setSongLoading(false);
      }
    };
    fetchSongs();
  }, [bandId]);

  useEffect(() => {
    const list = Array.isArray(allSongs) ? allSongs : [];
    if (!selectedSong && list.length > 0) {
      handleSelectSong(list[0]);
    }
  }, [allSongs, selectedSong]);

  // Fetch individual song lyrics when selected
  const handleSelectSong = async (song) => {
    if (song.lyrics) {
      setSelectedSong(song);
      return;
    }
    try {
      const resp = await fetch(`/api/songs/${song.id}`);
      const data = await resp.json();
      setSelectedSong(data);
      // Update cache
      setAllSongs((prev) =>
        Array.isArray(prev) ? prev.map((s) => (s.id === data.id ? data : s)) : []
      );
    } catch (err) {
      setSelectedSong(song);
    }
  };

  const refreshSelectedSong = useCallback(async () => {
    if (!selectedSong?.id) return;
    try {
      const resp = await fetch(`/api/songs/${selectedSong.id}`);
      if (!resp.ok) return;
      const data = await resp.json();
      setSelectedSong(data);
      setAllSongs((prev) =>
        Array.isArray(prev) ? prev.map((s) => (s.id === data.id ? data : s)) : []
      );
    } catch {
      // Ignore refresh errors and keep current state.
    }
  }, [selectedSong?.id]);

  useEffect(() => {
    if (activeTab !== 'cheatsheet') return;
    refreshSelectedSong();
  }, [activeTab, refreshSelectedSong]);

  const songsList = Array.isArray(allSongs) ? allSongs : [];

  const filteredSongs = songsList.filter((s) => {
    const q = songSearch.toLowerCase();
    return (
      (s.title || '').toLowerCase().includes(q) ||
      (s.artist || '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const onFocus = () => {
      if (activeTab === 'cheatsheet') {
        refreshSelectedSong();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [activeTab, refreshSelectedSong]);

  useEffect(() => {
    const onOutsideClick = (e) => {
      if (songComboRef.current && !songComboRef.current.contains(e.target)) {
        setShowSongDropdown(false);
      }
    };
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  // Transpose chords
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const renderLyrics = (text) => {
    if (!text) return null;
    const normalized = text.replace(/\r/g, '');
    return normalized.split('\n').map((line, i) => (
      <div key={i} className="lyrics-line">
        {line
          ? line.split(/(\[[A-G][#b]?(?:m|maj|min|sus|dim|aug)?[0-9]?\])/g).map((part, j) =>
              part.match(/^\[/) ? (
                <span key={j} className="chord-inline">{part.slice(1, -1)}</span>
              ) : (
                <span key={j}>{part}</span>
              )
            )
          : <span className="empty-line">&nbsp;</span>}
      </div>
    ));
  };

  const updateRequestStatus = async (id, status) => {
    try {
      await fetch('/api/live-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
    } catch (err) {
      console.error('Error updating request status:', err);
    }
  };

  const handleAcceptRequest = async (req) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: 'accepted' } : r))
    );
    updateRequestStatus(req.id, 'ACCEPTED');
    setActiveTab('cheatsheet');

    const requestedTitle = (req.song || '').trim().toLowerCase();
    if (!requestedTitle) return;

    const matched = songsList.find(
      (s) => (s.title || '').trim().toLowerCase() === requestedTitle
    );

    if (matched) {
      await handleSelectSong(matched);
      return;
    }

    const looseMatched = songsList.find((s) =>
      (s.title || '').toLowerCase().includes(requestedTitle)
    );
    if (looseMatched) {
      await handleSelectSong(looseMatched);
    }
  };

  const handleSkipRequest = (req) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: 'rejected' } : r))
    );
    updateRequestStatus(req.id, 'REJECTED');
  };

  const handleMarkPlayed = (req) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: 'played' } : r))
    );
    updateRequestStatus(req.id, 'PLAYED');
  };

  const playNotification = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.07, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.2);
      setTimeout(() => ctx.close(), 300);
    } catch {
      // Ignore sound errors.
    }
  };

  useEffect(() => {
    const pendingCount = requests.filter((r) => r.status === 'pending').length;
    if (
      settings.soundEnabled &&
      pendingCount > prevPendingCountRef.current &&
      prevPendingCountRef.current !== 0
    ) {
      playNotification();
    }
    prevPendingCountRef.current = pendingCount;
  }, [requests, settings.soundEnabled]);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const activeCount = requests.filter(
    (r) => r.status === 'pending' || r.status === 'accepted'
  ).length;

  const handleExit = () => {
    // In sub-views, treat exit as "step back".
    if (activeTab === 'cheatsheet' || activeTab === 'repertoire') {
      setActiveTab('requests');
      return;
    }
    // From main live view, exit to band dashboard.
    router.push('/bands');
  };

  return (
    <div className={`live-dashboard ${isNightMode ? 'night-vision' : ''}`}>
      {/* HUD Header */}
      <header className="hud-header">
        <div className="hud-left">
          <button 
            className="hud-btn exit-btn" 
            onClick={handleExit}
          >
            <ArrowLeft size={20} />
            <span>IZLAZ</span>
          </button>
          <div className="status-indicator">
            <div className="pulse-dot"></div>
            <span>LIVE: {settings.venueName}</span>
          </div>
        </div>
        <div className="hud-controls">
          <button 
            className={`hud-btn ${isNightMode ? 'active' : ''}`}
            onClick={() => setIsNightMode(!isNightMode)}
          >
            {isNightMode ? <Eye size={20} /> : <EyeOff size={20} />}
            <span>NIGHT VISION</span>
          </button>
          <button 
            className={`hud-btn exit-btn ${showSettings ? 'settings-active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="hud-main">
        {/* Sidebar Nav */}
        <nav className="hud-side-nav">
          <button className={`nav-item ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
            <MessageSquare size={24} />
            <span className="badge">{pendingCount}</span>
            <span className="nav-tooltip">Zahtevi</span>
          </button>
          <button className={`nav-item ${activeTab === 'cheatsheet' ? 'active' : ''}`} onClick={() => setActiveTab('cheatsheet')}>
            <Music size={24} />
            <span className="nav-tooltip">Tekst pesme</span>
          </button>
          <button className={`nav-item ${activeTab === 'repertoire' ? 'active' : ''}`} onClick={() => setActiveTab('repertoire')}>
            <ListMusic size={24} />
            <span className="nav-tooltip">Lista pesama</span>
          </button>
        </nav>

        {/* Content Area */}
        <section className="hud-content">
          {activeTab === 'requests' && (
            <div className="request-feed">
              <h2 className={`requests-title ${isNightMode ? 'night-glow' : ''}`}>Zahtevi Gostiju</h2>
              <div className="request-view-toggle">
                <button
                  className={`mini-tab ${requestView === 'active' ? 'active' : ''}`}
                  onClick={() => setRequestView('active')}
                >
                  Aktivni
                </button>
                <button
                  className={`mini-tab ${requestView === 'history' ? 'active' : ''}`}
                  onClick={() => setRequestView('history')}
                >
                  Istorija
                </button>
              </div>
              {requests.length === 0 ? (
                <div className="empty-state">
                  <MessageSquare size={48} />
                  <p>Nema aktivnih zahteva</p>
                </div>
              ) : (
                <div className="feed-grid">
                  {requests
                    .filter((r) =>
                      requestView === 'active'
                        ? r.status === 'pending' || r.status === 'accepted'
                        : r.status === 'rejected' || r.status === 'played'
                    )
                    .map(req => (
                    <div key={req.id} className={`request-card ${req.status}`} style={{ fontSize: `${fontScale}em` }}>
                      <div className="req-header">
                        <span className="time">{req.time}</span>
                        {settings.showTips && <span className="tip">{req.tip}</span>}
                      </div>
                      <h3 className="song-title">{req.song}</h3>
                      <p className="client-name">od: {req.client}</p>
                      <div className="req-actions">
                        {req.status === 'pending' && (
                          <>
                            <button
                              className="btn-hud accept"
                              onClick={() => handleAcceptRequest(req)}
                            >
                              Prihvati
                            </button>
                            <button className="btn-hud skip" onClick={() => handleSkipRequest(req)}>
                              Preskoči
                            </button>
                          </>
                        )}
                        {req.status === 'accepted' && (
                          <button className="btn-hud accept" onClick={() => handleMarkPlayed(req)}>
                            Svirano
                          </button>
                        )}
                        {(req.status === 'rejected' || req.status === 'played') && (
                          <span className="status-chip">{req.status === 'played' ? 'Svirano' : 'Preskočeno'}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {settings.maxRequests > 0 && requests.length >= settings.maxRequests && (
                <div className="max-requests-warning">
                  ⚠ Dostignut maksimalan broj zahteva ({settings.maxRequests})
                </div>
              )}
            </div>
          )}

          {activeTab === 'repertoire' && (
            <div className="song-picker">
              <h2>LISTA PESAMA</h2>
              <div className="song-search-box">
                <input
                  type="text"
                  placeholder="Pretraži naziv pesme..."
                  value={songSearch}
                  onChange={(e) => setSongSearch(e.target.value)}
                  className="song-search-input"
                />
              </div>

              {songLoading ? (
                <div className="song-loading">Učitavanje repertoara...</div>
              ) : filteredSongs.length === 0 ? (
                <div className="empty-state">
                  <Music size={48} />
                  <p>{songSearch ? 'Nema rezultata' : 'Repertoar je prazan'}</p>
                </div>
              ) : (
                <div className="song-picker-list">
                  {filteredSongs.map((song) => (
                    <button
                      key={song.id}
                      className={`song-picker-item ${song.lyrics ? 'has-lyrics' : ''}`}
                      onClick={async () => {
                        await handleSelectSong(song);
                        setActiveTab('cheatsheet');
                      }}
                    >
                      <div className="song-picker-info">
                        <span className="song-picker-title">{song.title}</span>
                        <span className="song-picker-artist">{song.artist}</span>
                      </div>
                      <div className="song-picker-meta">
                        {song.lyrics ? <span className="lyrics-tag">TEKST</span> : <span className="no-lyrics-tag">—</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'cheatsheet' && (
            <div className="cheatsheet-view">
              <div className="song-detail-view">
                <div className="song-detail-header">
                  <h2 className="detail-title">PODSETNIK — REPERTOAR</h2>
                  <div className="song-picker-combo" ref={songComboRef}>
                    <div className="song-search-inline">
                      <input
                        type="text"
                        placeholder="Pretraži pesmu ili izvođača..."
                        value={songSearch}
                        onChange={(e) => {
                          setSongSearch(e.target.value);
                          setShowSongDropdown(true);
                        }}
                        onFocus={() => setShowSongDropdown(true)}
                        className="song-search-input"
                      />
                      <button
                        type="button"
                        className="song-dropdown-toggle"
                        onClick={() => setShowSongDropdown((v) => !v)}
                        aria-label="Prikaži listu pesama"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>

                    {showSongDropdown && !songLoading && filteredSongs.length > 0 && (
                      <div className="song-dropdown-list">
                        {filteredSongs.map((song) => (
                          <button
                            key={song.id}
                            className="song-dropdown-item"
                            onClick={async () => {
                              await handleSelectSong(song);
                              setShowSongDropdown(false);
                            }}
                          >
                            <span className="song-dropdown-title">{song.title}</span>
                            <span className="song-dropdown-artist">{song.artist}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {songLoading ? (
                    <p className="detail-artist">Učitavanje repertoara...</p>
                  ) : filteredSongs.length === 0 ? (
                    <p className="detail-artist">
                      {songSearch ? 'Nema rezultata za pretragu.' : 'Repertoar je prazan.'}
                    </p>
                  ) : null}
                  {selectedSong?.key && <span className="key-badge">Tonalitet: {selectedSong.key}</span>}
                </div>

                <div className="lyrics-display" ref={lyricsRef} style={{ fontSize: `${fontScale}em` }}>
                  {selectedSong?.lyrics ? (
                    renderLyrics(selectedSong.lyrics)
                  ) : (
                    <div className="no-lyrics-msg">
                      <Music size={40} />
                      <p>Tekst za selektovanu pesmu još nije dodat.</p>
                      <p className="hint">Kliknite ispod da odmah dodate tekst za ovu pesmu.</p>
                      {selectedSong?.id && (
                        <button
                          type="button"
                          className="add-lyrics-btn"
                          onClick={() => router.push(`/bands/song/${selectedSong.id}`)}
                        >
                          Dodaj tekst
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right Panel: Performance Metrics */}
        <aside className="hud-metrics">
          <div className="metric-box">
            <Clock size={16} />
            <div className="label">VREME NA BINI</div>
            <div className="value">02:45:12</div>
          </div>
          <div className="metric-box">
            <Radio size={16} />
            <div className="label">BR. ZAHTEVA</div>
            <div className="value">{activeCount}</div>
          </div>
          <div className="metric-box">
            <Volume2 size={16} />
            <div className="label">ZVUK</div>
            <div className="value value-sm">{settings.soundEnabled ? 'UKLJ.' : 'ISKLJ.'}</div>
          </div>
        </aside>
      </main>

      {/* Settings Panel Overlay */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <h2>PODEŠAVANJA</h2>
              <button className="close-btn" onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="settings-body">
              {/* Venue Name */}
              <div className="setting-group">
                <label className="setting-label">NAZIV LOKALA</label>
                <input
                  type="text"
                  className="setting-input"
                  value={settings.venueName}
                  onChange={e => updateSetting('venueName', e.target.value)}
                  placeholder='npr. Kafana "Druga kuća"'
                />
                <p className="setting-hint">Prikazuje se u zaglavlju tokom nastupa</p>
              </div>

              {/* Max Requests */}
              <div className="setting-group">
                <label className="setting-label">MAKS. BROJ ZAHTEVA</label>
                <div className="setting-range-row">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={settings.maxRequests}
                    onChange={e => updateSetting('maxRequests', parseInt(e.target.value))}
                    className="setting-range"
                  />
                  <span className="range-value">{settings.maxRequests === 0 ? '∞' : settings.maxRequests}</span>
                </div>
                <p className="setting-hint">Ograničite koliko zahteva gosti mogu poslati (0 = bez limita)</p>
              </div>

              {/* Font Size */}
              <div className="setting-group">
                <label className="setting-label">
                  <Type size={14} /> VELIČINA TEKSTA
                </label>
                <div className="setting-range-row">
                  <input
                    type="range"
                    min="80"
                    max="150"
                    step="10"
                    value={settings.fontSize}
                    onChange={e => updateSetting('fontSize', parseInt(e.target.value))}
                    className="setting-range"
                  />
                  <span className="range-value">{settings.fontSize}%</span>
                </div>
                <p className="setting-hint">Povećajte tekst za bolju vidljivost na bini</p>
              </div>

              {/* Toggle: Show Tips */}
              <div className="setting-group">
                <div className="setting-toggle-row">
                  <div>
                    <label className="setting-label">PRIKAŽI NAPOJNICE</label>
                    <p className="setting-hint">Sakrij/prikaži iznose napojnica na zahtevima</p>
                  </div>
                  <button
                    className={`toggle-btn ${settings.showTips ? 'on' : 'off'}`}
                    onClick={() => updateSetting('showTips', !settings.showTips)}
                  >
                    <div className="toggle-knob" />
                  </button>
                </div>
              </div>

              {/* Toggle: Sound */}
              <div className="setting-group">
                <div className="setting-toggle-row">
                  <div>
                    <label className="setting-label">
                      {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />} ZVUČNA OBAVEŠTENJA
                    </label>
                    <p className="setting-hint">Zvučni signal za nove zahteve gostiju</p>
                  </div>
                  <button
                    className={`toggle-btn ${settings.soundEnabled ? 'on' : 'off'}`}
                    onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
                  >
                    <div className="toggle-knob" />
                  </button>
                </div>
              </div>

              {/* Toggle: Auto-Accept */}
              <div className="setting-group">
                <div className="setting-toggle-row">
                  <div>
                    <label className="setting-label">
                      {settings.autoAccept ? <Zap size={14} /> : <ZapOff size={14} />} AUTO PRIHVATANJE
                    </label>
                    <p className="setting-hint">Automatski prihvati sve dolazeće zahteve</p>
                  </div>
                  <button
                    className={`toggle-btn ${settings.autoAccept ? 'on' : 'off'}`}
                    onClick={() => updateSetting('autoAccept', !settings.autoAccept)}
                  >
                    <div className="toggle-knob" />
                  </button>
                </div>
              </div>

              {/* Reset Session */}
              <div className="setting-group danger-zone">
                <label className="setting-label danger">OPASNA ZONA</label>
                <button className="reset-btn" onClick={resetSession}>
                  <RotateCcw size={16} />
                  Resetuj Sesiju
                </button>
                <p className="setting-hint">Briše sve zahteve i resetuje brojače</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .live-dashboard {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #000;
          color: #eee;
          display: flex;
          flex-direction: column;
          font-family: 'JetBrains Mono', monospace;
        }

        .night-vision {
          color: #00ff00;
          text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
        }

        .hud-header {
          height: 60px;
          border-bottom: 1px solid #222;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 2rem;
          background: #0a0a0a;
          z-index: 10;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 0.8rem;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #ff0000;
          border-radius: 50%;
          animation: pulse 1s infinite alternate;
        }

        @keyframes pulse {
          from { opacity: 0.4; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1.2); }
        }

        .hud-left { display: flex; align-items: center; gap: 1.5rem; }
        .hud-controls { display: flex; gap: 1rem; }
        .hud-btn {
          background: #111;
          border: 1px solid #333;
          color: #888;
          padding: 6px 12px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 0.7rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .hud-btn.active {
          border-color: #00ff00;
          color: #00ff00;
        }

        .exit-btn {
          border-color: #ef4444;
          color: #ef4444;
          transition: all 0.2s ease;
        }
        .exit-btn:hover {
          background: #ef4444;
          color: #000;
          border-color: #ef4444;
        }
        .settings-active {
          background: #ef4444 !important;
          color: #000 !important;
          border-color: #ef4444 !important;
        }

        .hud-main {
          flex: 1;
          display: grid;
          grid-template-columns: 80px 1fr 240px;
        }

        .hud-side-nav {
          border-right: 1px solid #222;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 2rem;
          gap: 1.5rem;
        }

        .nav-item {
          background: none;
          border: none;
          color: #444;
          cursor: pointer;
          position: relative;
          transition: 0.2s;
        }

        .nav-item.active { color: #00ff00; }
        .nav-item .nav-tooltip {
          position: absolute;
          left: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%) translateX(-4px);
          background: rgba(10, 10, 10, 0.95);
          color: #e5e7eb;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.18s ease, transform 0.18s ease;
          z-index: 40;
        }
        .nav-item .nav-tooltip::before {
          content: '';
          position: absolute;
          left: -5px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-top: 5px solid transparent;
          border-bottom: 5px solid transparent;
          border-right: 5px solid rgba(10, 10, 10, 0.95);
        }
        .nav-item:hover .nav-tooltip {
          opacity: 1;
          transform: translateY(-50%) translateX(0);
        }
        .nav-item .badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #ff0000;
          color: white;
          font-size: 0.6rem;
          padding: 2px 5px;
          border-radius: 10px;
        }

        .hud-content {
          padding: 2rem;
          overflow-y: auto;
        }

        .hud-content h2 {
          font-size: 0.8rem;
          color: #555;
          text-transform: uppercase;
          margin-bottom: 2rem;
          letter-spacing: 2px;
        }
        .requests-title.night-glow {
          color: #00ff00 !important;
          text-shadow: 0 0 7px rgba(0, 255, 0, 0.5), 0 0 16px rgba(0, 255, 0, 0.22);
        }

        .feed-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }
        .request-view-toggle {
          display: inline-flex;
          border: 1px solid #222;
          border-radius: 999px;
          padding: 3px;
          gap: 4px;
          margin-bottom: 1.25rem;
        }
        .mini-tab {
          border: none;
          background: transparent;
          color: #777;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 8px 12px;
          border-radius: 999px;
          cursor: pointer;
        }
        .mini-tab.active {
          background: #00ff0012;
          color: #00ff00;
        }

        .request-card {
          background: #080808;
          border: 1px solid #1a1a1a;
          padding: 1.5rem;
          border-radius: 12px;
        }

        .request-card.accepted {
          border-color: #00ff0022;
          background: #00ff0005;
        }
        .request-card.skipped {
          border-color: #47556966;
          background: #0f172a22;
        }
        .request-card.played {
          border-color: #22c55e55;
          background: #16a34a14;
        }

        .req-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          margin-bottom: 1rem;
        }

        .tip { color: #ffd700; font-weight: 900; }

        .song-title {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }

        .client-name { color: #888; font-size: 0.8rem; }

        .req-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .btn-hud {
          flex: 1;
          background: #111;
          border: 1px solid #222;
          padding: 8px;
          border-radius: 6px;
          color: #eee;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-hud.accept:hover { background: #00ff00; color: #000; }
        .status-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid #2a2a2a;
          color: #9ca3af;
          font-size: 0.66rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 4rem 2rem;
          color: #333;
        }

        .max-requests-warning {
          margin-top: 2rem;
          padding: 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #ef4444;
          font-size: 0.75rem;
          font-weight: 700;
          text-align: center;
        }

        .hud-metrics {
          background: #050505;
          border-left: 1px solid #222;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .metric-box {
          border-bottom: 1px solid #111;
          padding-bottom: 1.5rem;
        }

        .metric-box .label {
          font-size: 0.6rem;
          color: #444;
          margin-top: 5px;
        }

        .metric-box .value {
          font-size: 1.5rem;
          font-weight: 900;
          margin-top: 5px;
        }

        .metric-box .value-sm {
          font-size: 0.9rem;
        }

        /* ======= SETTINGS PANEL ======= */
        .settings-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 100;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .settings-panel {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 420px;
          max-width: 100vw;
          background: #0a0a0a;
          border-left: 1px solid #222;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: 'JetBrains Mono', monospace;
          color: #eee;
          text-shadow: none;
        }

        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #1a1a1a;
          flex-shrink: 0;
        }

        .settings-header h2 {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 3px;
          color: #888;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: 1px solid #333;
          color: #888;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .close-btn:hover {
          border-color: #ef4444;
          color: #ef4444;
        }

        .settings-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .setting-group {
          padding: 1.25rem 0;
          border-bottom: 1px solid #111;
        }

        .setting-group:last-child {
          border-bottom: none;
        }

        .setting-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #888;
          margin-bottom: 0.75rem;
        }

        .setting-hint {
          font-size: 0.7rem;
          color: #444;
          margin-top: 0.5rem;
          line-height: 1.4;
          letter-spacing: 0;
        }

        .setting-input {
          width: 100%;
          background: #111;
          border: 1px solid #222;
          color: #eee;
          padding: 10px 14px;
          border-radius: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .setting-input:focus {
          border-color: #00ff00;
        }
        .setting-input::placeholder {
          color: #333;
        }

        .setting-range-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .setting-range {
          flex: 1;
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: #222;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .setting-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: #00ff00;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #000;
        }
        .setting-range::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #00ff00;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #000;
        }

        .range-value {
          font-size: 0.85rem;
          font-weight: 800;
          color: #00ff00;
          min-width: 32px;
          text-align: right;
        }

        .setting-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .setting-toggle-row .setting-label {
          margin-bottom: 0;
        }
        .setting-toggle-row .setting-hint {
          margin-top: 0.25rem;
        }

        .toggle-btn {
          width: 48px;
          height: 26px;
          border-radius: 13px;
          border: none;
          cursor: pointer;
          position: relative;
          transition: background 0.3s ease;
          flex-shrink: 0;
        }
        .toggle-btn.on {
          background: #00ff00;
        }
        .toggle-btn.off {
          background: #333;
        }

        .toggle-knob {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #000;
          position: absolute;
          top: 3px;
          transition: left 0.3s ease;
        }
        .toggle-btn.on .toggle-knob {
          left: 25px;
        }
        .toggle-btn.off .toggle-knob {
          left: 3px;
        }

        .danger-zone {
          margin-top: 0.5rem;
        }

        .danger-zone .danger {
          color: #ef4444;
        }

        .reset-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .reset-btn:hover {
          background: #ef4444;
          color: #000;
          border-color: #ef4444;
        }

        /* ======= CHEATSHEET / SONG PICKER ======= */
        .cheatsheet-view {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .song-picker {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }

        .song-search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #111;
          border: 1px solid #222;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 1.5rem;
          color: #888;
        }
        .song-search-box-compact {
          width: 100%;
          max-width: 560px;
        }
        .song-picker-combo {
          width: 100%;
          max-width: 560px;
          margin-bottom: 0.9rem;
          position: relative;
        }
        .song-search-inline {
          display: flex;
          align-items: center;
          background: #111;
          border: 1px solid #222;
          border-radius: 8px;
          overflow: hidden;
        }
        .song-search-inline .song-search-input {
          margin: 0;
          border: none;
          padding: 10px 12px;
        }
        .song-dropdown-toggle {
          width: 38px;
          height: 38px;
          border: none;
          border-left: 1px solid #222;
          background: #0d0d0d;
          color: #9ca3af;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .song-dropdown-toggle:hover {
          color: #00ff00;
          background: #121212;
        }
        .song-dropdown-list {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(100% + 6px);
          max-height: 280px;
          overflow-y: auto;
          background: #0b0b0b;
          border: 1px solid #1f1f1f;
          border-radius: 8px;
          z-index: 35;
          box-shadow: 0 14px 26px rgba(0, 0, 0, 0.35);
          scrollbar-width: auto;
          scrollbar-color: #6a6a6a #151515;
        }
        .song-dropdown-list::-webkit-scrollbar {
          width: 15px;
        }
        .song-dropdown-list::-webkit-scrollbar-track {
          background: #151515;
          border-radius: 8px;
        }
        .song-dropdown-list::-webkit-scrollbar-thumb {
          background: #6a6a6a;
          border-radius: 8px;
          border: 1px solid #202020;
        }
        .song-dropdown-list::-webkit-scrollbar-thumb:hover {
          background: #7a7a7a;
        }
        .song-dropdown-item {
          width: 100%;
          text-align: left;
          border: none;
          background: transparent;
          color: #d1d5db;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          cursor: pointer;
        }
        .song-dropdown-item:hover {
          background: #141414;
        }
        .song-dropdown-title {
          font-size: 0.84rem;
          font-weight: 700;
        }
        .song-dropdown-artist {
          font-size: 0.7rem;
          color: #6b7280;
        }
        .song-search-input {
          flex: 1;
          background: none;
          border: none;
          color: #eee;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          outline: none;
        }
        .song-search-input::placeholder { color: #333; }

        .song-loading {
          color: #444;
          font-size: 0.8rem;
          padding: 2rem;
          text-align: center;
        }

        .song-picker-list {
          flex: 1;
          min-height: 0;
          max-height: calc(100vh - 320px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          display: flex;
          flex-direction: column;
          gap: 2px;
          scrollbar-width: thin;
          scrollbar-color: #6a6a6a #151515;
        }
        .song-picker-list::-webkit-scrollbar {
          width: 15px;
        }
        .song-picker-list::-webkit-scrollbar-track {
          background: #151515;
          border-radius: 8px;
        }
        .song-picker-list::-webkit-scrollbar-thumb {
          background: #6a6a6a;
          border-radius: 8px;
          border: 1px solid #202020;
        }
        .song-picker-list::-webkit-scrollbar-thumb:hover {
          background: #7a7a7a;
        }

        .song-picker-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #080808;
          border: 1px solid #111;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
          color: #ccc;
          font-family: 'JetBrains Mono', monospace;
        }
        .song-picker-item:hover {
          background: #111;
          border-color: #333;
        }
        .song-picker-item.has-lyrics {
          border-left: 3px solid #00ff00;
        }

        .song-picker-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .song-picker-title {
          font-size: 0.9rem;
          font-weight: 700;
        }
        .song-picker-artist {
          font-size: 0.7rem;
          color: #555;
        }

        .song-picker-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .genre-tag {
          font-size: 0.6rem;
          color: #444;
          padding: 2px 8px;
          background: #111;
          border-radius: 4px;
          font-weight: 600;
        }
        .lyrics-tag {
          font-size: 0.55rem;
          color: #00ff00;
          padding: 2px 8px;
          background: rgba(0, 255, 0, 0.08);
          border: 1px solid rgba(0, 255, 0, 0.2);
          border-radius: 4px;
          font-weight: 800;
          letter-spacing: 1px;
        }
        .no-lyrics-tag {
          font-size: 0.7rem;
          color: #333;
        }

        /* Song Detail / Lyrics View */
        .song-detail-view {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .back-to-list {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: #555;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 1px;
          cursor: pointer;
          margin-bottom: 1.5rem;
          padding: 0;
          transition: color 0.2s;
        }
        .back-to-list:hover { color: #00ff00; }

        .song-detail-header {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #1a1a1a;
        }
        .detail-title {
          font-size: 1.8rem !important;
          font-weight: 900 !important;
          color: #eee !important;
          text-transform: none !important;
          letter-spacing: -0.5px !important;
          margin-bottom: 0.25rem !important;
        }
        .detail-artist {
          font-size: 0.85rem;
          color: #555;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }
        .song-select {
          width: 100%;
          max-width: 560px;
          margin-bottom: 0.9rem;
          background: #111;
          border: 1px solid #222;
          color: #eee;
          padding: 10px 12px;
          border-radius: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.82rem;
          outline: none;
        }
        .song-select:focus {
          border-color: #00ff00;
        }
        .key-badge {
          font-size: 0.65rem;
          color: #00ff00;
          background: rgba(0, 255, 0, 0.05);
          border: 1px solid rgba(0, 255, 0, 0.15);
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .lyrics-display {
          flex: 1;
          overflow-y: auto;
          max-height: calc(100vh - 260px);
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          line-height: 2;
          font-family: 'Outfit', 'JetBrains Mono', monospace;
          font-size: 1.1rem;
          color: #ccc;
          white-space: pre-wrap;
          padding-right: 0.35rem;
          scrollbar-width: thin;
          scrollbar-color: #6a6a6a #151515;
        }
        .lyrics-display::-webkit-scrollbar {
          width: 15px;
        }
        .lyrics-display::-webkit-scrollbar-track {
          background: #151515;
          border-radius: 8px;
        }
        .lyrics-display::-webkit-scrollbar-thumb {
          background: #6a6a6a;
          border-radius: 8px;
          border: 1px solid #202020;
        }
        .lyrics-display::-webkit-scrollbar-thumb:hover {
          background: #7a7a7a;
        }
        .lyrics-line {
          margin-bottom: 2px;
          min-height: 1.55em;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .chord-inline {
          color: #00ff00;
          font-weight: 900;
          margin: 0 2px;
          font-size: 0.85em;
          text-shadow: 0 0 8px rgba(0, 255, 0, 0.3);
        }
        .empty-line {
          display: inline-block;
          width: 100%;
          min-height: 1.2em;
        }

        .no-lyrics-msg {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 4rem 2rem;
          color: #333;
          text-align: center;
        }
        .no-lyrics-msg .hint {
          font-size: 0.7rem;
          color: #444;
        }
        .add-lyrics-btn {
          margin-top: 0.8rem;
          border: 1px solid rgba(0, 255, 0, 0.35);
          background: rgba(0, 255, 0, 0.08);
          color: #00ff00;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .add-lyrics-btn:hover {
          background: rgba(0, 255, 0, 0.16);
          border-color: rgba(0, 255, 0, 0.6);
        }

        @media (max-width: 1024px) {
          .feed-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
        }

        @media (max-width: 768px) {
          .hud-main { grid-template-columns: 60px 1fr; }
          .hud-metrics { display: none; }
          .settings-panel { width: 100vw; }
          .nav-item .nav-tooltip { display: none; }
          .hud-content { padding: 1rem; }
          .feed-grid { grid-template-columns: 1fr; }
          .request-card { padding: 1rem; }
          .req-actions { gap: 0.5rem; }
          .song-picker-combo,
          .song-select,
          .song-search-box-compact { max-width: 100%; }
          .detail-title { font-size: 1.35rem !important; }
          .lyrics-display { font-size: 1rem; max-height: calc(100vh - 230px); }
        }
      `}</style>
    </div>
  );
}
