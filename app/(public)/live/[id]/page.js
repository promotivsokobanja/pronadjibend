'use client';
import { Search, Music, CheckCircle2, AlertCircle, Wallet, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

const TIP_PRESETS = [1000, 2000, 5000];

/**
 * orderFlow: null | table | tip_choice | tip_amount | song_voucher | song_success_brief
 * castiModal: null | menu | voucher | success (samo bakšiš bez pesme, ako allowTips)
 */
export default function GuestLivePage({ params }) {
  const rawId = params.id;
  const [ownerType, setOwnerType] = useState(null); // 'band' | 'musician'
  const [bandId, setBandId] = useState(null);
  const [musicianId, setMusicianId] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [allowTips, setAllowTips] = useState(true);

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
            setAllowTips(true);
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
      if (!resp.ok) throw new Error(data.error || 'Greška pri slanju zahteva');

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
      if (!resp.ok) throw new Error(data.error || 'Slanje nije uspelo.');
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

  return (
    <div className="guest-container container">
      <div className="blob" style={{ top: '10%', right: '10%' }}></div>
      <header className="guest-header">
        <div className="live-indicator">
          <span className="dot"></span> UŽIVO NASTUP
        </div>
        <h1>Pronađi Bend</h1>
        <p className="subtitle-text">Izaberite pesmu i pošaljite zahtev bendu direktno sa vašeg stola.</p>
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
      </header>

      {!loading && !hasLiveSetLists && (
        <div className="preparing-banner">
          <Music size={20} />
          <p>Muzičari trenutno pripremaju repertoar, naručivanje će biti dostupno uskoro.</p>
        </div>
      )}

      <main className="song-list">
        {loading ? (
          <div className="empty-state">
            <div className="spinner"></div>
            <p>Učitavanje repertoara...</p>
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
            <h3>Naruči pesmu</h3>
            <p className="selected-song">
              {selectedSong.title} {selectedSong.artist ? `— ${selectedSong.artist}` : ''}
            </p>
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
              Zahtev za pesmu je poslat bendu. Ovaj ekran pokažite osoblju radi naplate bakšiša.
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
            <p>Hvala! Bend je obavešten.</p>
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
              {tipSending ? 'Šaljem bendu…' : 'Potvrdi i obavesti bend'}
            </button>
          </div>
        </div>
      )}

      {castiModal === 'success' && (
        <div className="modal-overlay">
          <div className="success-card glass-card voucher-success">
            <CheckCircle2 size={48} color="#16a34a" />
            <h2>Poslato bendu</h2>
            <p>Bend je obavešten. Pokažite ekran konobaru radi naplate.</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .guest-container {
          padding-top: 4rem;
          padding-bottom: 4rem;
          min-height: 100vh;
        }
        .preparing-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          max-width: 600px;
          margin: 0 auto 1.5rem;
          padding: 1rem 1.25rem;
          border-radius: 16px;
          border: 1px solid #fbbf24;
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(245, 158, 11, 0.04));
          color: #92400e;
          font-size: 0.9rem;
          font-weight: 600;
          line-height: 1.45;
        }
        .preparing-banner p { margin: 0; }
        .guest-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .live-indicator {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.1);
          color: var(--accent-primary);
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 0.7rem;
          font-weight: 800;
          margin-bottom: 1.5rem;
        }
        .dot {
          width: 6px;
          height: 6px;
          background: var(--accent-primary);
          border-radius: 50%;
          animation: pulse 1s infinite alternate;
        }
        @keyframes pulse {
          from {
            opacity: 0.4;
          }
          to {
            opacity: 1;
          }
        }
        .guest-header h1 {
          font-size: clamp(1.75rem, 6vw, 3rem);
          font-weight: 800;
          margin-bottom: 1rem;
          color: #0f172a;
        }
        .subtitle-text {
          color: #64748b;
          font-size: 1rem;
          max-width: 28rem;
          margin-left: auto;
          margin-right: auto;
        }
        .search-bar {
          max-width: 500px;
          margin: 2.5rem auto 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.25rem;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 100px;
        }
        .search-bar input {
          background: none;
          border: none;
          color: #0f172a;
          width: 100%;
          outline: none;
          font-size: 0.95rem;
        }
        .search-bar input::placeholder {
          color: #94a3b8;
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
          border: 2px solid rgba(34, 197, 94, 0.45);
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(16, 185, 129, 0.08));
          color: #15803d;
          font-weight: 800;
          font-size: 1rem;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .casti-bend-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(34, 197, 94, 0.2);
        }

        .gender-tabs-container {
          overflow-x: auto;
          margin-top: 2rem;
          padding-bottom: 1rem;
          -webkit-overflow-scrolling: touch;
        }
        .gender-tabs-container::-webkit-scrollbar {
          height: 4px;
        }
        .gender-tabs-container::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }

        .gender-tabs {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          min-width: max-content;
          padding: 0 1rem;
        }
        .tab-btn {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #64748b;
          padding: 0.6rem 1rem;
          border-radius: 100px;
          cursor: pointer;
          transition: 0.3s;
          font-weight: 700;
          font-size: 0.7rem;
          white-space: nowrap;
        }
        .tab-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .tab-btn.active {
          background: #007aff;
          color: white;
          border-color: #007aff;
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
          padding: 1.25rem 1.5rem;
          cursor: pointer;
          border: 1px solid #e2e8f0;
          transition: 0.2s;
          background: #ffffff;
          border-radius: 16px;
        }
        .song-row:hover {
          background: #f8fafc;
          transform: translateY(-2px);
          border-color: #007aff;
          box-shadow: 0 4px 12px rgba(0, 122, 255, 0.08);
        }
        .song-title {
          font-weight: 700;
          font-size: 1.05rem;
          margin-bottom: 0.25rem;
          color: #0f172a;
        }
        .song-artist {
          font-size: 0.85rem;
          color: #64748b;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 1.5rem;
        }
        .modal,
        .success-card {
          width: 100%;
          max-width: 400px;
          padding: 3rem;
          text-align: center;
          background: #ffffff;
          border-radius: 24px;
          border: 1px solid #e2e8f0;
          position: relative;
        }
        .tip-choice-modal {
          max-width: 420px;
        }
        .tip-choice-lede {
          font-weight: 700;
          color: #007aff;
          margin: 0.5rem 0 0.25rem;
          font-size: 1rem;
        }
        .tip-choice-table {
          font-size: 0.85rem;
          color: #64748b;
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
          box-shadow: 0 10px 28px rgba(234, 179, 8, 0.35);
          line-height: 1.25;
        }
        .btn-gold-tip:hover {
          filter: brightness(1.03);
        }
        .btn-skip-tip {
          width: 100%;
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 4px;
          cursor: pointer;
          padding: 0.65rem 0.5rem;
          margin-bottom: 0.5rem;
        }
        .song-voucher-card {
          max-width: 440px;
        }
        .song-voucher-shout {
          margin: 1.25rem 0 1rem;
          font-size: clamp(1rem, 4.2vw, 1.2rem);
          font-weight: 900;
          letter-spacing: 0.04em;
          line-height: 1.35;
          color: #0f172a;
          text-transform: uppercase;
        }
        .song-voucher-sub {
          font-size: 0.9rem;
          color: #64748b;
          line-height: 1.5;
          margin: 0 0 1.5rem;
        }
        .voucher-note-tight {
          margin-top: 0.5rem;
        }

        .voucher-modal {
          max-width: 420px;
          text-align: left;
          padding: 2rem 1.75rem 2.25rem;
        }
        .casti-menu-modal {
          text-align: center;
        }
        .casti-menu-lede {
          color: #64748b;
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
          box-shadow: 0 10px 32px rgba(34, 197, 94, 0.35);
          line-height: 1.25;
        }
        .btn-waiter-tip-main:hover {
          filter: brightness(1.05);
        }
        .btn-text-muted {
          background: none;
          border: none;
          color: #64748b;
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
          background: #f1f5f9;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #0f172a;
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
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(0, 122, 255, 0.2));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #007aff;
        }
        .voucher-band-name {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.02em;
        }
        .voucher-label-amount {
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
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
          border: 2px solid #e2e8f0;
          background: #f8fafc;
          font-weight: 800;
          font-size: 0.9rem;
          color: #0f172a;
          cursor: pointer;
        }
        .preset-chip.active {
          border-color: #22c55e;
          background: rgba(34, 197, 94, 0.12);
          color: #15803d;
        }
        .voucher-shout {
          margin: 1.25rem 0 0.5rem;
          font-size: 1.05rem;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-align: center;
          color: #0f172a;
        }
        .voucher-note {
          font-size: 0.88rem;
          line-height: 1.55;
          color: #64748b;
          text-align: center;
          margin: 0 0 1.25rem;
        }
        .voucher-form-group label {
          text-align: left;
        }
        .voucher-confirm {
          width: 100%;
          margin-top: 0.5rem;
        }
        .btn-full {
          width: 100%;
          justify-content: center;
        }

        .modal h3 {
          color: #0f172a;
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .selected-song {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 1rem 0 2rem;
          color: #007aff;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.75rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }
        .form-group input {
          width: 100%;
          padding: 1rem;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          color: #0f172a;
          font-size: 1.5rem;
          text-align: center;
          font-weight: 800;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .form-group input::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }
        .form-group input:focus {
          border-color: #007aff;
        }
        .modal-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .success-card h2 {
          color: #0f172a;
          margin: 1rem 0 0.5rem;
        }
        .success-card p {
          color: #64748b;
        }
        .voucher-success h2 {
          color: #15803d;
        }

        .error-msg {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 4rem 2rem;
          color: #94a3b8;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #007aff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 640px) {
          .song-row {
            padding: 1rem;
          }
          .modal,
          .success-card {
            padding: 2rem 1.5rem;
          }
          .voucher-modal {
            padding: 1.75rem 1.25rem 2rem;
          }
        }
      `}</style>
    </div>
  );
}
