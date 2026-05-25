'use client';
import { Search, Music, CheckCircle2, AlertCircle, Wallet, ArrowLeft, WifiOff } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';

const TIP_PRESETS = [1000, 2000, 5000];

/**
 * orderFlow: null | table | tip_choice | tip_amount | song_voucher | song_success_brief
 * castiModal: null | menu | voucher | success (samo bakšiš bez pesme, ako allowTips)
 */
export default function GuestLivePage({ params }) {
  const rawId = params.id;
  const STATUS_STORAGE_KEY = `pb-live-guest-status:${rawId}`;
  const [ownerType, setOwnerType] = useState(null); // 'band' | 'musician'
  const [bandId, setBandId] = useState(null);
  const [musicianId, setMusicianId] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [allowTips, setAllowTips] = useState(true);
  const [allowFullRepertoireLive, setAllowFullRepertoireLive] = useState(false);

  const [hasLiveSetLists, setHasLiveSetLists] = useState(true);
  const [selectedSong, setSelectedSong] = useState(null);
  const [tableNum, setTableNum] = useState('');
  const [orderFlow, setOrderFlow] = useState(null);
  const [orderSending, setOrderSending] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderTipAmount, setOrderTipAmount] = useState(null);
  const [orderTipCustom, setOrderTipCustom] = useState('');
  const [songVoucherAmount, setSongVoucherAmount] = useState(null);

  const [bandName, setBandName] = useState('');
  const [castiModal, setCastiModal] = useState(null);
  const [tipTableNum, setTipTableNum] = useState('');
  const [tipAmount, setTipAmount] = useState(null);
  const [tipCustom, setTipCustom] = useState('');
  const [tipError, setTipError] = useState('');
  const [tipSending, setTipSending] = useState(false);
  const [guestRequestStatus, setGuestRequestStatus] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const statusPollIntervalRef = useRef(4000);
  const statusPollBoostTimeoutRef = useRef(null);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.sessionStorage.getItem(STATUS_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed?.id && parsed?.requestType === 'song') {
        setGuestRequestStatus(parsed);
      }
    } catch {
      /* ignore storage errors */
    }
  }, [STATUS_STORAGE_KEY]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (guestRequestStatus?.id) {
        window.sessionStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(guestRequestStatus));
      } else {
        window.sessionStorage.removeItem(STATUS_STORAGE_KEY);
      }
    } catch {
      /* ignore storage errors */
    }
  }, [guestRequestStatus, STATUS_STORAGE_KEY]);

  const closeCasti = useCallback(() => {
    setCastiModal(null);
    setTipTableNum('');
    setTipAmount(null);
    setTipCustom('');
    setTipError('');
    setTipSending(false);
  }, []);

  const resetOrderFlow = useCallback(() => {
    setOrderFlow(null);
    setSelectedSong(null);
    setTableNum('');
    setOrderError('');
    setOrderTipAmount(null);
    setOrderTipCustom('');
    setSongVoucherAmount(null);
    setOrderSending(false);
  }, []);

  const openCastiMenu = () => {
    resetOrderFlow();
    setCastiModal('menu');
  };

  // Detect owner type (band or musician) from rawId
  useEffect(() => {
    const detect = async () => {
      try {
        const bandResp = await fetch(`/api/bands/${encodeURIComponent(rawId)}`);
        if (bandResp.ok) {
          const b = await bandResp.json();
          if (!b?.error) {
            setBandId(String(b.id || rawId));
            setOwnerType('band');
            if (b?.name) setBandName(String(b.name));
            setAllowTips(b?.allowTips !== false);
            setAllowFullRepertoireLive(Boolean(b?.allowFullRepertoireLive));
            return;
          }
        }
        const musicianResp = await fetch(`/api/musicians/${encodeURIComponent(rawId)}`);
        if (musicianResp.ok) {
          const m = await musicianResp.json();
          if (!m?.error) {
            setMusicianId(String(m.id || rawId));
            setOwnerType('musician');
            if (m?.name) setBandName(String(m.name));
            setAllowTips(m?.allowTips !== false);
            setAllowFullRepertoireLive(Boolean(m?.allowFullRepertoireLive));
            return;
          }
        }
        setOwnerType('unknown');
      } catch {
        setOwnerType('unknown');
      }
    };
    detect();
  }, [rawId]);

  // Fetch songs from live setlists first, fallback to full repertoire — polls every 30s
  useEffect(() => {
    const ownerId = ownerType === 'band' ? bandId : musicianId;
    if (!ownerType || ownerType === 'unknown') {
      if (ownerType === 'unknown') setLoading(false);
      return;
    }
    if (!ownerId) return;
    let cancelled = false;
    const fetchSongs = async (isPolling = false) => {
      try {
        const param = ownerType === 'band'
          ? `bandId=${encodeURIComponent(ownerId)}`
          : `musicianId=${encodeURIComponent(ownerId)}`;

        const liveResp = await fetch(`/api/live-songs?${param}`, { cache: 'no-store' });
        const liveData = await liveResp.json();
        if (cancelled) return;

        setAllowFullRepertoireLive(Boolean(liveData?.allowFullRepertoireLive));

        if (liveData.hasLiveSetLists && Array.isArray(liveData.songs) && liveData.songs.length > 0) {
          setHasLiveSetLists(true);
          setSongs(liveData.songs);
          const cats = [...new Set(liveData.songs.map((s) => s.category || s.type).filter(Boolean))];
          if (cats.length > 0) setActiveTab((t) => t || cats[0]);
        } else if (liveData.hasLiveSetLists === false) {
          setHasLiveSetLists(false);
          if (!isPolling) {
            const fallbackResp = await fetch(`/api/songs?${param}`);
            const fallbackData = await fallbackResp.json();
            if (cancelled) return;
            const list = Array.isArray(fallbackData) ? fallbackData : [];
            setSongs(list);
            const cats = [...new Set(list.map((s) => s.category || s.type).filter(Boolean))];
            if (cats.length > 0) setActiveTab((t) => t || cats[0]);
          }
        } else {
          setHasLiveSetLists(true);
          setSongs([]);
        }
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        if (!isPolling) {
          try {
            const param = ownerType === 'band'
              ? `bandId=${encodeURIComponent(ownerId)}`
              : `musicianId=${encodeURIComponent(ownerId)}`;
            const resp = await fetch(`/api/songs?${param}`);
            const data = await resp.json();
            if (!cancelled) setSongs(Array.isArray(data) ? data : []);
          } catch { /* ignore */ }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSongs(false);
    const intervalId = setInterval(() => fetchSongs(true), 30000);
    return () => { cancelled = true; clearInterval(intervalId); };
  }, [ownerType, bandId, musicianId]);

  useEffect(() => {
    const ownerId = ownerType === 'band' ? bandId : musicianId;
    if (!guestRequestStatus?.id || !ownerId || ownerType === 'unknown') return;

    let cancelled = false;
    const param = ownerType === 'band'
      ? `bandId=${encodeURIComponent(ownerId)}`
      : `musicianId=${encodeURIComponent(ownerId)}`;

    const syncGuestRequestStatus = async () => {
      try {
        const response = await fetch(`/api/live-requests?${param}`, { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled || !Array.isArray(data)) return;
        const matched = data.find((entry) => entry?.id === guestRequestStatus.id);
        if (!matched) return;
        setGuestRequestStatus((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: matched.status,
            time: matched.time || prev.time,
          };
        });
      } catch {
        /* ignore polling errors */
      }
    };

    syncGuestRequestStatus();
    const intervalId = window.setInterval(syncGuestRequestStatus, statusPollIntervalRef.current);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [guestRequestStatus?.id, ownerType, bandId, musicianId]);

  const categories = [...new Set(songs.map((s) => s.category || s.type).filter(Boolean))];

  const filteredSongs = songs.filter((s) => {
    const cat = s.category || s.type || '';
    const matchCat = !activeTab || cat === activeTab;
    const q = searchTerm.toLowerCase();
    const matchSearch =
      (s.title || '').toLowerCase().includes(q) || (s.artist || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const submitSongRequest = async (waiterTipRsd) => {
    if (!selectedSong?.id) return;
    if (!String(tableNum || '').trim()) {
      setOrderError('Unesite broj stola.');
      return;
    }

    setOrderSending(true);
    setOrderError('');
    try {
      const body = {
        songId: selectedSong.id,
        tableNum: String(tableNum).trim(),
      };
      if (ownerType === 'band') body.bandId = bandId;
      else body.musicianId = musicianId;
      if (waiterTipRsd > 0) body.waiterTipRsd = waiterTipRsd;

      const resp = await fetch('/api/live-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok) {
        if (data.limitReached) {
          throw new Error(`Dnevni limit od ${data.dailyLimit || 3} besplatnih zahteva je dostignut. Pokušajte ponovo sutra.`);
        }
        const errMsg = data.error === 'Pesma nije pronađena.'
          ? 'Pesma više nije dostupna. Osvežite stranicu za ažuriranu listu.'
          : (data.error || 'Greška pri slanju zahteva');
        throw new Error(errMsg);
      }

      setGuestRequestStatus({
        id: data.id,
        requestType: 'song',
        songTitle: selectedSong.title,
        artist: selectedSong.artist || '',
        tableNum: String(tableNum).trim(),
        status: data.status || 'pending',
        time: 'upravo',
      });

      // Boost polling speed for 30s after submission
      statusPollIntervalRef.current = 2000;
      if (statusPollBoostTimeoutRef.current) clearTimeout(statusPollBoostTimeoutRef.current);
      statusPollBoostTimeoutRef.current = setTimeout(() => { statusPollIntervalRef.current = 4000; }, 30000);

      if (waiterTipRsd > 0) {
        setSongVoucherAmount(waiterTipRsd);
        setOrderFlow('song_voucher');
      } else {
        setOrderFlow('song_success_brief');
        setTimeout(() => resetOrderFlow(), 2600);
      }
    } catch (err) {
      setOrderError(err.message || 'Greška.');
    } finally {
      setOrderSending(false);
    }
  };

  const goTableNext = () => {
    if (!String(tableNum || '').trim()) {
      alert('Molimo unesite broj stola.');
      return;
    }
    setOrderError('');
    if (allowTips) setOrderFlow('tip_choice');
    else submitSongRequest(0);
  };

  const orderSelectPreset = (n) => {
    setOrderTipAmount(n);
    setOrderTipCustom(String(n));
    setOrderError('');
  };

  const orderOnTipCustomChange = (raw) => {
    setOrderTipCustom(raw);
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setOrderTipAmount(null);
      return;
    }
    const n = parseInt(digits, 10);
    if (!Number.isNaN(n) && n > 0) {
      setOrderTipAmount(n);
      setOrderError('');
    } else {
      setOrderTipAmount(null);
    }
  };

  const confirmOrderTipAndSend = () => {
    const amount = orderTipAmount;
    if (!amount || amount < 1) {
      setOrderError('Izaberite ili unesite iznos u RSD.');
      return;
    }
    submitSongRequest(amount);
  };

  const selectPreset = (n) => {
    setTipAmount(n);
    setTipCustom(String(n));
    setTipError('');
  };

  const onTipCustomChange = (raw) => {
    setTipCustom(raw);
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setTipAmount(null);
      return;
    }
    const n = parseInt(digits, 10);
    if (!Number.isNaN(n) && n > 0) {
      setTipAmount(n);
      setTipError('');
    } else {
      setTipAmount(null);
    }
  };

  const confirmWaiterTip = async () => {
    setTipError('');
    const t = String(tipTableNum || '').trim();
    if (!t) {
      setTipError('Unesite broj stola.');
      return;
    }
    const amount = tipAmount;
    if (!amount || amount < 1) {
      setTipError('Izaberite ili unesite iznos u RSD.');
      return;
    }

    const message = `Sto ${t} šalje bakšiš preko konobara (${amount} RSD)`;

    setTipSending(true);
    try {
      const tipBody = { requestType: 'WAITER_TIP', tableNum: t, message };
      if (ownerType === 'band') tipBody.bandId = bandId;
      else tipBody.musicianId = musicianId;
      const resp = await fetch('/api/live-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tipBody),
      });
      const data = await resp.json();
      if (!resp.ok) {
        if (data.limitReached) {
          throw new Error(`Dnevni limit od ${data.dailyLimit || 3} besplatnih zahteva je dostignut. Pokušajte ponovo sutra.`);
        }
        throw new Error(data.error || 'Slanje nije uspelo.');
      }
      setCastiModal('success');
      setTimeout(() => {
        closeCasti();
      }, 3200);
    } catch (e) {
      setTipError(e.message || 'Greška.');
    } finally {
      setTipSending(false);
    }
  };

  const displayBand = bandName || 'Bend';
  const showSongModal = selectedSong && orderFlow !== null;
  const tableStep = orderFlow === 'table';
  const tipChoiceStep = orderFlow === 'tip_choice';
  const tipAmountStep = orderFlow === 'tip_amount';
  const songVoucherStep = orderFlow === 'song_voucher';
  const songSuccessBrief = orderFlow === 'song_success_brief';
  const repertoireModeLabel = allowFullRepertoireLive ? 'Pun repertoar je dostupan' : 'Naručivanje iz live set liste';
  const repertoireModeHint = allowFullRepertoireLive
    ? 'Možete tražiti i pesme van aktivnih live set lista.'
    : 'Trenutno su dostupne pesme koje je izvođač uključio za live nastup.';
  const guestRequestStatusLabel = guestRequestStatus?.status === 'accepted'
    ? 'Prihvaćena'
    : guestRequestStatus?.status === 'rejected'
      ? 'Odbijena'
      : guestRequestStatus?.status === 'played'
        ? 'Odsvirana'
        : 'Na čekanju';

  return (
    <div className="guest-container container">
      <div className="blob" style={{ top: '10%', right: '10%' }}></div>
      {isOffline && (
        <div className="offline-banner">
          <WifiOff size={18} />
          <span>Nema internet veze. Proverite WiFi i pokušajte ponovo.</span>
        </div>
      )}
      <header className="guest-header">
        <div className="live-indicator">
          <span className="dot"></span> UŽIVO NASTUP
        </div>
        <h1>{displayBand}</h1>
        <p className="subtitle-text">Izaberite pesmu i pošaljite zahtev direktno sa vašeg stola</p>
        <div className="live-status-grid">
          <div className="live-status-card">
            <div className="live-status-kicker">BAKŠIŠ</div>
            <div className={`live-status-value ${allowTips ? 'is-on' : 'is-off'}`}>
              {allowTips ? 'Dozvoljen' : 'Trenutno isključen'}
            </div>
            <p className="live-status-copy">
              {allowTips
                ? 'Možete poslati pesmu uz bakšiš preko konobara ili posebno častiti izvođača.'
                : 'Slanje pesme je dostupno, ali bez bakšiša preko gostujućeg formulara.'}
            </p>
          </div>
          <div className="live-status-card">
            <div className="live-status-kicker">REPERTOAR</div>
            <div className={`live-status-value ${allowFullRepertoireLive ? 'is-on' : 'is-neutral'}`}>
              {repertoireModeLabel}
            </div>
            <p className="live-status-copy">{repertoireModeHint}</p>
          </div>
        </div>
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder={`Pretraži ${songs.length}+ pesama...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {categories.length > 0 && (
          <div className="gender-tabs-container">
            <div className="gender-tabs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`tab-btn ${activeTab === cat ? 'active' : ''}`}
                  onClick={() => setActiveTab(cat)}
                >
                  {cat} ({songs.filter((s) => (s.category || s.type) === cat).length})
                </button>
              ))}
            </div>
          </div>
        )}

        {allowTips && (
          <button type="button" className="casti-bend-btn" onClick={openCastiMenu}>
            <Wallet size={20} aria-hidden />
            Časti bend
          </button>
        )}
        {guestRequestStatus?.id && (
          <div className={`guest-request-status-card status-${guestRequestStatus.status || 'pending'}`}>
            <div className="guest-request-status-head">
              <div>
                <div className="guest-request-status-kicker">VAŠ POSLEDNJI ZAHTEV</div>
                <div className="guest-request-status-title">{guestRequestStatus.songTitle}</div>
                {guestRequestStatus.artist ? (
                  <div className="guest-request-status-artist">{guestRequestStatus.artist}</div>
                ) : null}
              </div>
              <span className={`guest-request-status-pill status-${guestRequestStatus.status || 'pending'}`}>
                {guestRequestStatusLabel}
              </span>
            </div>
            <p className="guest-request-status-copy">
              Sto {guestRequestStatus.tableNum}
              {guestRequestStatus.status === 'accepted'
                ? ' • Izvođač je prihvatio vaš zahtev.'
                : guestRequestStatus.status === 'rejected'
                  ? ' • Izvođač je trenutno odbio ovaj zahtev.'
                  : guestRequestStatus.status === 'played'
                    ? ' • Pesma je označena kao odsvirana.'
                    : ' • Zahtev je poslat i čeka odgovor izvođača.'}
            </p>
          </div>
        )}
      </header>

      {!loading && !hasLiveSetLists && (
        <div className="preparing-banner">
          <Music size={20} />
          <p>
            {allowFullRepertoireLive
              ? 'Live set lista trenutno nije aktivna, ali je deo repertoara i dalje dostupan za naručivanje.'
              : 'Muzičari trenutno pripremaju repertoar, naručivanje će biti dostupno uskoro.'}
          </p>
        </div>
      )}

      <main className="song-list">
        {loading ? (
          <div className="empty-state">
            <div className="spinner"></div>
            <p>Učitavanje live repertoara...</p>
          </div>
        ) : filteredSongs.length > 0 ? (
          filteredSongs.map((song) => (
            <div
              key={song.id}
              className="song-row glass-card"
              onClick={() => {
                closeCasti();
                setSelectedSong(song);
                setTableNum('');
                setOrderError('');
                setOrderTipAmount(null);
                setOrderTipCustom('');
                setOrderFlow('table');
              }}
            >
              <div className="song-info">
                <p className="song-title">{song.title}</p>
                <p className="song-artist">{song.artist || 'Nepoznat izvođač'}</p>
              </div>
              <button className="btn btn-secondary btn-sm" type="button">
                Naruči
              </button>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Music size={32} />
            <p>{searchTerm ? 'Nema rezultata za pretragu.' : 'Repertoar je prazan.'}</p>
          </div>
        )}
      </main>

      {showSongModal && tableStep && (
        <div className="modal-overlay">
          <div className="modal glass-card">
            <div className="modal-step-chip">Korak 1 od 2</div>
            <h3>Naruči pesmu</h3>
            <p className="selected-song">
              {selectedSong.title} {selectedSong.artist ? `— ${selectedSong.artist}` : ''}
            </p>
            <p className="modal-support-copy">Unesite broj svog stola da bend zna odakle je stigao zahtev.</p>
            {orderError && (
              <div className="error-msg">
                <AlertCircle size={16} /> {orderError}
              </div>
            )}
            <div className="form-group">
              <label>Vaš broj stola</label>
              <input
                type="number"
                placeholder="npr. 12"
                value={tableNum}
                onChange={(e) => setTableNum(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={resetOrderFlow}
                type="button"
                disabled={orderSending}
              >
                Odustani
              </button>
              <button
                className="btn btn-primary"
                onClick={goTableNext}
                disabled={orderSending}
                type="button"
              >
                {allowTips ? 'Nastavi' : orderSending ? 'Šaljem…' : 'Pošalji bendu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSongModal && tipChoiceStep && (
        <div className="modal-overlay">
          <div className="modal glass-card tip-choice-modal">
            <div className="modal-step-chip">Korak 2 od 2</div>
            <h3>Želiš li da častiš bend uz ovu pesmu?</h3>
            <p className="tip-choice-lede">
              {selectedSong.title}
              {selectedSong.artist ? ` — ${selectedSong.artist}` : ''}
            </p>
            <p className="tip-choice-table">Sto {String(tableNum || '').trim() || '—'}</p>
            {orderError && (
              <div className="error-msg">
                <AlertCircle size={16} /> {orderError}
              </div>
            )}
            <button
              type="button"
              className="btn-gold-tip"
              onClick={() => {
                setOrderError('');
                setOrderFlow('tip_amount');
              }}
            >
              Častim preko konobara
            </button>
            <button
              type="button"
              className="btn-skip-tip"
              onClick={() => submitSongRequest(0)}
              disabled={orderSending}
            >
              Samo pošalji pesmu (bez bakšiša)
            </button>
            <button type="button" className="btn-text-muted" onClick={() => setOrderFlow('table')}>
              Nazad
            </button>
          </div>
        </div>
      )}

      {showSongModal && tipAmountStep && (
        <div className="modal-overlay">
          <div className="modal glass-card voucher-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="voucher-back"
              onClick={() => setOrderFlow('tip_choice')}
              aria-label="Nazad"
            >
              <ArrowLeft size={22} />
            </button>
            <div className="modal-step-chip modal-step-chip-inline">Korak 2 od 2</div>

            <div className="voucher-hero">
              <div className="voucher-music-icon" aria-hidden>
                <Music size={40} strokeWidth={2.2} />
              </div>
              <h3 className="voucher-band-name">{displayBand}</h3>
            </div>

            <p className="voucher-label-amount">Iznos (RSD)</p>
            <div className="amount-presets">
              {TIP_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`preset-chip ${
                    orderTipAmount === n && orderTipCustom === String(n) ? 'active' : ''
                  }`}
                  onClick={() => orderSelectPreset(n)}
                >
                  {n} RSD
                </button>
              ))}
            </div>
            <div className="form-group voucher-form-group">
              <label>Ili unesite iznos</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="npr. 1500"
                value={orderTipCustom}
                onChange={(e) => orderOnTipCustomChange(e.target.value)}
                autoComplete="off"
              />
            </div>

            <p className="voucher-note voucher-note-tight">
              Konobar će iznos dodati na račun ili uzeti keš i proslediti bendu.
            </p>

            {orderError && (
              <div className="error-msg">
                <AlertCircle size={16} /> {orderError}
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary btn-full voucher-confirm"
              onClick={confirmOrderTipAndSend}
              disabled={orderSending}
            >
              {orderSending ? 'Šaljem…' : 'Pošalji zahtev bendu'}
            </button>
          </div>
        </div>
      )}

      {showSongModal && songVoucherStep && songVoucherAmount != null && (
        <div className="modal-overlay">
          <div className="success-card glass-card song-voucher-card">
            <CheckCircle2 size={48} color="#16a34a" />
            <p className="song-voucher-shout">
              POKAŽITE KONOBARU: Sto {String(tableNum).trim()} časti muziku {songVoucherAmount} RSD
            </p>
            <p className="song-voucher-sub">
              Zahtev za pesmu je poslat izvođaču. Ovaj ekran pokažite osoblju radi naplate bakšiša.
            </p>
            <button type="button" className="btn btn-primary btn-full" onClick={resetOrderFlow}>
              Zatvori
            </button>
          </div>
        </div>
      )}

      {showSongModal && songSuccessBrief && (
        <div className="modal-overlay">
          <div className="success-card glass-card">
            <CheckCircle2 size={48} color="var(--accent-primary)" />
            <h2>Zahtev poslat</h2>
            <p>Hvala! Izvođač je obavešten.</p>
          </div>
        </div>
      )}

      {castiModal === 'menu' && allowTips && (
        <div className="modal-overlay" onClick={closeCasti} role="presentation">
          <div className="modal glass-card casti-menu-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Časti bend</h3>
            <p className="casti-menu-lede">Zahvalite bendu na nastupu — najčešće preko osoblja u lokalu.</p>
            <button type="button" className="btn-waiter-tip-main" onClick={() => setCastiModal('voucher')}>
              Pošalji bakšiš preko konobara
            </button>
            <button type="button" className="btn-text-muted" onClick={closeCasti}>
              Zatvori
            </button>
          </div>
        </div>
      )}

      {castiModal === 'voucher' && allowTips && (
        <div className="modal-overlay" onClick={closeCasti} role="presentation">
          <div className="modal glass-card voucher-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="voucher-back" onClick={() => setCastiModal('menu')} aria-label="Nazad">
              <ArrowLeft size={22} />
            </button>
            <div className="modal-step-chip modal-step-chip-inline">Bakšiš preko konobara</div>

            <div className="voucher-hero">
              <div className="voucher-music-icon" aria-hidden>
                <Music size={40} strokeWidth={2.2} />
              </div>
              <h3 className="voucher-band-name">{displayBand}</h3>
            </div>

            <div className="form-group voucher-form-group">
              <label>Broj stola</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="npr. 12"
                value={tipTableNum}
                onChange={(e) => setTipTableNum(e.target.value.replace(/[^\d]/g, ''))}
                autoComplete="off"
              />
            </div>

            <p className="voucher-label-amount">Iznos (RSD)</p>
            <div className="amount-presets">
              {TIP_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`preset-chip ${tipAmount === n && tipCustom === String(n) ? 'active' : ''}`}
                  onClick={() => selectPreset(n)}
                >
                  {n} RSD
                </button>
              ))}
            </div>
            <div className="form-group voucher-form-group">
              <label>Ili unesite iznos</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="npr. 1500"
                value={tipCustom}
                onChange={(e) => onTipCustomChange(e.target.value)}
                autoComplete="off"
              />
            </div>

            <p className="voucher-shout">POKAŽITE OVO KONOBARU</p>
            <p className="voucher-note">
              Konobar će ovaj iznos dodati na vaš račun ili uzeti keš i proslediti bendu.
            </p>

            {tipError && (
              <div className="error-msg">
                <AlertCircle size={16} /> {tipError}
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary btn-full voucher-confirm"
              onClick={confirmWaiterTip}
              disabled={tipSending}
            >
              {tipSending ? 'Šaljem izvođaču…' : 'Potvrdi i obavesti izvođača'}
            </button>
          </div>
        </div>
      )}

      {castiModal === 'success' && (
        <div className="modal-overlay">
          <div className="success-card glass-card voucher-success">
            <CheckCircle2 size={48} color="#16a34a" />
            <h2>Poslato izvođaču</h2>
            <p>Izvođač je obavešten. Pokažite ekran konobaru radi naplate.</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .guest-container {
          padding-top: 4rem;
          padding-bottom: max(4rem, env(safe-area-inset-bottom, 0px));
          min-height: 100vh;
          min-height: 100dvh;
          background: #0a0e1a;
        }
        .preparing-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          max-width: 600px;
          margin: 0 auto 1.5rem;
          padding: 1rem 1.25rem;
          border-radius: 16px;
          border: 1px solid rgba(251, 191, 36, 0.3);
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.05));
          color: #fbbf24;
          font-size: 0.9rem;
          font-weight: 600;
          line-height: 1.45;
        }
        .preparing-banner p { margin: 0; }
        .offline-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          max-width: 600px;
          margin: 0 auto 1.25rem;
          padding: 0.85rem 1.1rem;
          border-radius: 14px;
          border: 1px solid rgba(239, 68, 68, 0.4);
          background: linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.06));
          color: #f87171;
          font-size: 0.88rem;
          font-weight: 700;
          line-height: 1.4;
          animation: offlinePulse 2s ease-in-out infinite;
        }
        @keyframes offlinePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .guest-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .live-indicator {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(99, 102, 241, 0.12);
          color: #818cf8;
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 0.72rem;
          font-weight: 800;
          margin-bottom: 1.25rem;
          letter-spacing: 0.06em;
        }
        .dot {
          width: 7px;
          height: 7px;
          background: #6366f1;
          border-radius: 50%;
          animation: pulse 1s infinite alternate;
          box-shadow: 0 0 8px rgba(99, 102, 241, 0.6);
        }
        @keyframes pulse {
          from { opacity: 0.4; }
          to { opacity: 1; }
        }
        .guest-header h1 {
          font-size: clamp(1.8rem, 7vw, 3.2rem);
          font-weight: 800;
          margin-bottom: 0.75rem;
          color: #ffffff;
          letter-spacing: -0.02em;
        }
        .subtitle-text {
          color: #94a3b8;
          font-size: 1rem;
          max-width: 26rem;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.5;
        }
        .live-status-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
          max-width: 600px;
          margin: 1.25rem auto 0;
          text-align: left;
        }
        .live-status-card {
          border: 1px solid rgba(99, 102, 241, 0.12);
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.7);
          padding: 0.85rem 1rem;
          min-width: 0;
        }
        .live-status-kicker {
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 0.35rem;
        }
        .live-status-value {
          font-size: 0.92rem;
          font-weight: 800;
          line-height: 1.3;
          color: #e2e8f0;
          overflow-wrap: anywhere;
        }
        .live-status-value.is-on { color: #4ade80; }
        .live-status-value.is-off { color: #fbbf24; }
        .live-status-value.is-neutral { color: #e2e8f0; }
        .live-status-copy {
          margin: 0.35rem 0 0;
          color: #64748b;
          font-size: 0.78rem;
          line-height: 1.45;
        }
        .search-bar {
          max-width: 500px;
          margin: 2rem auto 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.8rem 1.25rem;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 100px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .search-bar:focus-within {
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .search-bar input {
          background: none;
          border: none;
          color: #f1f5f9;
          width: 100%;
          outline: none;
          font-size: 0.95rem;
        }
        .search-bar input::placeholder { color: #64748b; }
        .search-bar :global(svg) { color: #64748b; }

        .song-row :global(.btn-secondary) {
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.25);
          color: #818cf8;
          font-weight: 700;
          border-radius: 10px;
          padding: 0.5rem 1rem;
          font-size: 0.82rem;
          cursor: pointer;
          transition: 0.15s;
          white-space: nowrap;
        }
        .song-row :global(.btn-secondary:hover) {
          background: rgba(99, 102, 241, 0.2);
          border-color: #6366f1;
        }

        .casti-bend-btn {
          margin-top: 1.25rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          max-width: 340px;
          padding: 0.9rem 1.25rem;
          border-radius: 16px;
          border: 2px solid rgba(34, 197, 94, 0.35);
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.08));
          color: #4ade80;
          font-weight: 800;
          font-size: 1rem;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .casti-bend-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(34, 197, 94, 0.15);
        }
        .guest-request-status-card {
          max-width: 600px;
          margin: 1rem auto 0;
          padding: 1rem 1.05rem;
          border-radius: 16px;
          border: 1px solid #334155;
          background: rgba(30, 41, 59, 0.9);
          text-align: left;
        }
        .guest-request-status-card.status-pending {
          border-color: rgba(99, 102, 241, 0.3);
          background: rgba(30, 58, 138, 0.2);
        }
        .guest-request-status-card.status-accepted {
          border-color: rgba(34, 197, 94, 0.3);
          background: rgba(20, 83, 45, 0.2);
        }
        .guest-request-status-card.status-rejected {
          border-color: rgba(248, 113, 113, 0.3);
          background: rgba(127, 29, 29, 0.2);
        }
        .guest-request-status-card.status-played {
          border-color: rgba(168, 85, 247, 0.3);
          background: rgba(88, 28, 135, 0.2);
        }
        .guest-request-status-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.85rem;
        }
        .guest-request-status-kicker {
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 0.3rem;
        }
        .guest-request-status-title {
          font-size: 1rem;
          font-weight: 800;
          color: #f1f5f9;
          overflow-wrap: anywhere;
        }
        .guest-request-status-artist {
          margin-top: 0.2rem;
          color: #94a3b8;
          font-size: 0.84rem;
          overflow-wrap: anywhere;
        }
        .guest-request-status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.4rem 0.7rem;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 800;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .guest-request-status-pill.status-pending {
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
        }
        .guest-request-status-pill.status-accepted {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
        }
        .guest-request-status-pill.status-rejected {
          background: rgba(248, 113, 113, 0.15);
          color: #f87171;
        }
        .guest-request-status-pill.status-played {
          background: rgba(168, 85, 247, 0.15);
          color: #c084fc;
        }
        .guest-request-status-copy {
          margin: 0.6rem 0 0;
          color: #94a3b8;
          font-size: 0.88rem;
          line-height: 1.5;
        }

        .gender-tabs-container {
          overflow-x: auto;
          margin-top: 1.5rem;
          padding-bottom: 0.75rem;
          -webkit-overflow-scrolling: touch;
        }
        .gender-tabs-container::-webkit-scrollbar { height: 3px; }
        .gender-tabs-container::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }

        .gender-tabs {
          display: flex;
          justify-content: center;
          gap: 0.4rem;
          min-width: max-content;
          padding: 0 1rem;
        }
        .tab-btn {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(99, 102, 241, 0.12);
          color: #94a3b8;
          padding: 0.55rem 1rem;
          border-radius: 100px;
          cursor: pointer;
          transition: 0.2s;
          font-weight: 700;
          font-size: 0.72rem;
          white-space: nowrap;
        }
        .tab-btn:hover {
          background: rgba(99, 102, 241, 0.08);
          color: #e2e8f0;
          border-color: rgba(99, 102, 241, 0.25);
        }
        .tab-btn.active {
          background: #6366f1;
          color: #ffffff;
          border-color: #6366f1;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .song-list {
          max-width: 600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .song-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.15rem 1.35rem;
          cursor: pointer;
          border: 1px solid rgba(99, 102, 241, 0.08);
          transition: 0.2s;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 14px;
        }
        .song-row:hover {
          background: rgba(99, 102, 241, 0.08);
          transform: translateY(-1px);
          border-color: rgba(99, 102, 241, 0.3);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.12);
        }
        .song-title {
          font-weight: 700;
          font-size: 1.02rem;
          margin-bottom: 0.2rem;
          color: #f1f5f9;
        }
        .song-artist {
          font-size: 0.84rem;
          color: #64748b;
        }

        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 1rem;
          padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px));
          padding-top: max(1rem, env(safe-area-inset-top, 0px));
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .modal,
        .success-card {
          width: 100%;
          max-width: 400px;
          padding: 2.5rem 2rem;
          text-align: center;
          background: #1e293b;
          border-radius: 24px;
          border: 1px solid rgba(99, 102, 241, 0.15);
          position: relative;
          margin: auto;
          max-height: calc(100vh - 2rem);
          max-height: calc(100dvh - 2rem);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
        }
        .modal-step-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 28px;
          padding: 0.35rem 0.7rem;
          border-radius: 999px;
          background: rgba(99, 102, 241, 0.12);
          color: #818cf8;
          font-size: 0.73rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          margin-bottom: 0.9rem;
        }
        .modal-step-chip-inline {
          margin: 0 auto 0.25rem;
          width: fit-content;
        }
        .modal-support-copy {
          margin: 0.35rem 0 1.2rem;
          color: #94a3b8;
          font-size: 0.92rem;
          line-height: 1.5;
        }
        .tip-choice-modal { max-width: 420px; }
        .tip-choice-lede {
          font-weight: 700;
          color: #818cf8;
          margin: 0.5rem 0 0.25rem;
          font-size: 1rem;
        }
        .tip-choice-table {
          font-size: 0.85rem;
          color: #94a3b8;
          margin: 0 0 1.5rem;
        }
        .btn-gold-tip {
          width: 100%;
          padding: 1.1rem 1.25rem;
          border-radius: 16px;
          border: 2px solid #ca8a04;
          background: linear-gradient(180deg, #fde047 0%, #eab308 55%, #ca8a04 100%);
          color: #422006;
          font-weight: 900;
          font-size: 1.05rem;
          cursor: pointer;
          margin-bottom: 1rem;
          box-shadow: 0 10px 28px rgba(234, 179, 8, 0.25);
          line-height: 1.25;
        }
        .btn-gold-tip:hover { filter: brightness(1.03); }
        .btn-skip-tip {
          width: 100%;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 4px;
          cursor: pointer;
          padding: 0.65rem 0.5rem;
          margin-bottom: 0.5rem;
        }
        .song-voucher-card { max-width: 440px; }
        .song-voucher-shout {
          margin: 1.25rem 0 1rem;
          font-size: clamp(1rem, 4.2vw, 1.2rem);
          font-weight: 900;
          letter-spacing: 0.04em;
          line-height: 1.35;
          color: #f1f5f9;
          text-transform: uppercase;
        }
        .song-voucher-sub {
          font-size: 0.9rem;
          color: #94a3b8;
          line-height: 1.5;
          margin: 0 0 1.5rem;
        }
        .voucher-note-tight { margin-top: 0.5rem; }

        .voucher-modal {
          max-width: 420px;
          text-align: left;
          padding: 2rem 1.75rem 2.25rem;
        }
        .casti-menu-modal {
          text-align: center;
          max-width: 380px;
          padding: 2.25rem 1.75rem;
        }
        .casti-menu-lede {
          color: #94a3b8;
          font-size: 0.95rem;
          margin: 0.5rem 0 1.5rem;
          line-height: 1.5;
        }
        .btn-waiter-tip-main {
          width: 100%;
          padding: 1.15rem 1.25rem;
          border-radius: 16px;
          border: none;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #fff;
          font-weight: 800;
          font-size: 1.05rem;
          cursor: pointer;
          margin-bottom: 1rem;
          box-shadow: 0 10px 32px rgba(34, 197, 94, 0.25);
          line-height: 1.25;
        }
        .btn-waiter-tip-main:hover { filter: brightness(1.05); }
        .btn-text-muted {
          background: none;
          border: none;
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          width: 100%;
          padding: 0.5rem;
        }
        .voucher-back {
          position: absolute;
          top: 1rem;
          left: 1rem;
          background: #334155;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #f1f5f9;
        }
        .voucher-hero {
          text-align: center;
          margin: 2rem 0 1.25rem;
        }
        .voucher-music-icon {
          width: 72px;
          height: 72px;
          margin: 0 auto 1rem;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #818cf8;
        }
        .voucher-band-name {
          font-size: 1.5rem;
          font-weight: 800;
          color: #f1f5f9;
          margin: 0;
          letter-spacing: -0.02em;
        }
        .voucher-label-amount {
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
          margin: 1rem 0 0.5rem;
        }
        .amount-presets {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .preset-chip {
          flex: 1;
          min-width: 86px;
          padding: 0.65rem 0.5rem;
          border-radius: 12px;
          border: 2px solid #334155;
          background: rgba(15, 23, 42, 0.8);
          font-weight: 800;
          font-size: 0.9rem;
          color: #f1f5f9;
          cursor: pointer;
          transition: 0.15s;
        }
        .preset-chip.active {
          border-color: #22c55e;
          background: rgba(34, 197, 94, 0.12);
          color: #4ade80;
        }
        .voucher-shout {
          margin: 1.25rem 0 0.5rem;
          font-size: 1.05rem;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-align: center;
          color: #f1f5f9;
        }
        .voucher-note {
          font-size: 0.88rem;
          line-height: 1.55;
          color: #94a3b8;
          text-align: center;
          margin: 0 0 1.25rem;
        }
        .voucher-form-group label { text-align: left; }
        .voucher-confirm { width: 100%; margin-top: 0.5rem; }
        .btn-full { width: 100%; justify-content: center; }

        .modal h3 {
          color: #f1f5f9;
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.25;
        }
        .selected-song {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 1rem 0 2rem;
          color: #818cf8;
          overflow-wrap: anywhere;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.75rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
        }
        .form-group input {
          width: 100%;
          padding: 1rem;
          background: #0f172a;
          border: 2px solid #334155;
          border-radius: 12px;
          color: #f1f5f9;
          font-size: 1.5rem;
          text-align: center;
          font-weight: 800;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .form-group input::placeholder { color: #64748b; font-weight: 400; }
        .form-group input:focus { border-color: #6366f1; }
        .modal-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .success-card h2 { color: #f1f5f9; margin: 1rem 0 0.5rem; }
        .success-card p { color: #94a3b8; }
        .voucher-success h2 { color: #4ade80; }

        .error-msg {
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          gap: 8px;
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.3);
          color: #f87171;
          padding: 0.75rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 1rem;
          text-align: left;
          line-height: 1.45;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 4rem 2rem;
          color: #64748b;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #334155;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 640px) {
          .guest-container {
            padding-top: 2.75rem;
            padding-bottom: 2.75rem;
          }
          .subtitle-text {
            font-size: 0.92rem;
            max-width: 100%;
          }
          .live-status-grid {
            grid-template-columns: 1fr;
            gap: 0.6rem;
            margin-top: 1rem;
          }
          .live-status-card {
            padding: 0.75rem 0.9rem;
            border-radius: 14px;
          }
          .live-status-copy { display: none; }
          .search-bar {
            margin-top: 1.25rem;
            padding: 0.7rem 1rem;
            gap: 0.75rem;
          }
          .casti-bend-btn {
            max-width: 100%;
            min-height: 50px;
          }
          .guest-request-status-card {
            margin-top: 0.85rem;
            padding: 0.85rem;
            border-radius: 14px;
          }
          .guest-request-status-head {
            flex-direction: column;
            align-items: stretch;
          }
          .guest-request-status-pill { width: 100%; }
          .guest-request-status-copy { font-size: 0.82rem; }
          .song-row {
            padding: 0.95rem 1rem;
            align-items: flex-start;
            gap: 0.75rem;
          }
          .song-title, .song-artist { overflow-wrap: anywhere; }
          .modal-overlay {
            padding: 0.75rem;
            align-items: flex-start;
            padding-top: max(0.75rem, env(safe-area-inset-top, 0px));
            padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));
          }
          .modal, .success-card {
            padding: 1.75rem 1.25rem;
            border-radius: 20px;
            max-height: calc(100vh - 1.5rem);
            max-height: calc(100dvh - 1.5rem);
          }
          .voucher-modal { padding: 1.5rem 1.1rem 1.75rem; }
          .casti-menu-modal { padding: 1.75rem 1.25rem; }
          .voucher-hero { margin: 1.25rem 0 1rem; }
          .voucher-music-icon { width: 56px; height: 56px; border-radius: 16px; }
          .voucher-band-name { font-size: 1.2rem; }
          .voucher-back { top: 0.75rem; left: 0.75rem; width: 36px; height: 36px; border-radius: 10px; }
          .modal-step-chip { width: 100%; margin-bottom: 0.8rem; }
          .modal-step-chip-inline { width: calc(100% - 3rem); margin: 0 auto 0.35rem; }
          .modal h3 { font-size: 1.2rem; }
          .selected-song { margin: 0.75rem 0 1.2rem; font-size: 1rem; }
          .modal-support-copy, .casti-menu-lede, .tip-choice-table, .voucher-note, .song-voucher-sub { font-size: 0.84rem; }
          .form-group input { font-size: 1.2rem; padding: 0.85rem; }
          .form-group label { margin-bottom: 0.5rem; }
          .preset-chip { min-width: calc(50% - 0.25rem); min-height: 44px; }
          .btn-gold-tip, .btn-waiter-tip-main, .btn-skip-tip, .btn-text-muted, .voucher-confirm { min-height: 48px; }
          .btn-waiter-tip-main { font-size: 0.95rem; padding: 1rem; }
          .btn-gold-tip { font-size: 0.95rem; padding: 1rem; }
          .voucher-shout { font-size: 0.95rem; margin: 1rem 0 0.4rem; }
          .voucher-label-amount { margin: 0.75rem 0 0.4rem; }
          .amount-presets { margin-bottom: 0.35rem; }
          .modal-actions { grid-template-columns: 1fr; gap: 0.75rem; }
          .error-msg { font-size: 0.8rem; padding: 0.65rem; }
        }

        @media (max-width: 380px) {
          .modal, .success-card { padding: 1.5rem 1rem; border-radius: 18px; }
          .voucher-modal { padding: 1.25rem 0.9rem 1.5rem; }
          .casti-menu-modal { padding: 1.5rem 1rem; }
          .modal h3 { font-size: 1.1rem; }
          .voucher-band-name { font-size: 1.05rem; }
          .voucher-music-icon { width: 48px; height: 48px; }
          .form-group input { font-size: 1.1rem; padding: 0.75rem; }
          .preset-chip { font-size: 0.82rem; padding: 0.55rem 0.4rem; }
        }

        @media (min-width: 641px) and (max-width: 900px) {
          .guest-container { padding-top: 3.25rem; }
          .live-status-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; max-width: 680px; }
          .song-list { max-width: 680px; }
          .song-row { padding: 1.1rem 1.2rem; }
          .modal, .success-card { max-width: 460px; padding: 2.35rem 2rem; }
          .voucher-modal { max-width: 460px; padding: 2rem 1.75rem 2.25rem; }
          .casti-menu-modal { max-width: 420px; }
        }
      `}</style>
    </div>
  );
}
