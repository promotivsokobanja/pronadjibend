'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Play, Pause, Music, ShoppingBag, ArrowLeft, Lock, Clock, Download, X, FileText, Share2 } from 'lucide-react';
import Link from 'next/link';

export default function DemoPesmePage() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [playingId, setPlayingId] = useState(null);
  const [audioLoading, setAudioLoading] = useState(null);
  const [accessMap, setAccessMap] = useState({});
  const [requesting, setRequesting] = useState(null);
  const [lyricsModal, setLyricsModal] = useState(null); // { title, artist, lyrics }
  const audioRef = useRef(null);

  const [purchasedSongs, setPurchasedSongs] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [songsRes, accessRes] = await Promise.all([
          fetch('/api/demo-songs'),
          fetch('/api/demo-songs/request'),
        ]);
        const songsData = await songsRes.json();
        if (Array.isArray(songsData)) setSongs(songsData);
        if (accessRes.ok) {
          const accessData = await accessRes.json();
          if (accessData?.map) {
            setAccessMap(accessData.map);
            if (Array.isArray(accessData.purchased)) setPurchasedSongs(accessData.purchased);
          } else if (typeof accessData === 'object' && !Array.isArray(accessData)) {
            setAccessMap(accessData);
          }
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const categories = [...new Set(songs.map((s) => s.category).filter(Boolean))];

  const filtered = songs.filter((s) => {
    const matchCat = !activeCategory || s.category === activeCategory;
    const q = searchTerm.toLowerCase();
    const matchSearch = s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const previewTimerRef = useRef(null);

  const playPreview = useCallback(async (songId) => {
    if (playingId === songId) {
      // Stop
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      setPlayingId(null);
      return;
    }

    setAudioLoading(songId);
    try {
      const r = await fetch(`/api/demo-songs/preview?id=${songId}`);
      const data = await r.json();
      if (!r.ok || !data.url) throw new Error(data.error || 'Greška');

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.addEventListener('ended', () => setPlayingId(null));
      }

      audioRef.current.pause();
      audioRef.current.src = data.url;

      // Wait for metadata to get duration, then limit to 25%
      audioRef.current.onloadedmetadata = () => {
        const totalDuration = audioRef.current.duration;
        const maxPlayTime = totalDuration * 0.25; // Only 25%
        if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
        previewTimerRef.current = setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
          }
          setPlayingId(null);
        }, maxPlayTime * 1000);
      };

      await audioRef.current.play();
      setPlayingId(songId);
    } catch (err) {
      console.error('Preview error:', err);
      alert('Nije moguće pustiti preview.');
    } finally {
      setAudioLoading(null);
    }
  }, [playingId]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const handleDownload = async (songId) => {
    try {
      const r = await fetch(`/api/demo-songs/download?id=${songId}`);
      const data = await r.json();
      if (!r.ok) { alert(data.error || 'Greška'); return; }
      if (data.lyrics) {
        setLyricsModal({ title: data.title, artist: data.artist, lyrics: data.lyrics, url: data.url });
      } else {
        window.open(data.url, '_blank');
      }
    } catch { alert('Greška pri preuzimanju.'); }
  };

  const handleRequest = async (songId) => {
    setRequesting(songId);
    try {
      const r = await fetch('/api/demo-songs/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }),
      });
      const data = await r.json();
      if (!r.ok) { alert(data.error || 'Greška'); return; }
      setAccessMap((prev) => ({ ...prev, [songId]: data.status || 'PENDING' }));
    } catch { alert('Greška.'); }
    finally { setRequesting(null); }
  };

  const handleCancel = async (songId) => {
    if (!confirm('Da li ste sigurni da želite da odustanete?')) return;
    try {
      const r = await fetch('/api/demo-songs/request', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }),
      });
      if (r.ok) {
        setAccessMap((prev) => { const copy = { ...prev }; delete copy[songId]; return copy; });
      } else {
        const data = await r.json();
        alert(data.error || 'Greška');
      }
    } catch { alert('Greška.'); }
  };

  const renderBuyBtn = (song) => {
    const status = accessMap[song.id];
    if (status === 'PAID') {
      return (
        <button type="button" className="ap-btn ap-btn-download" onClick={() => handleDownload(song.id)}>
          <Download size={14} /> Preuzmi
        </button>
      );
    }
    if (status === 'APPROVED') {
      return (
        <>
          <button type="button" className="ap-btn ap-btn-approved" disabled>
            <Clock size={14} /> Čeka uplatu
          </button>
          <button type="button" className="ap-btn ap-btn-cancel" onClick={() => handleCancel(song.id)}>
            <X size={14} /> Odustani
          </button>
        </>
      );
    }
    if (status === 'PENDING') {
      return (
        <>
          <button type="button" className="ap-btn ap-btn-pending" disabled>
            <Clock size={14} /> Na čekanju
          </button>
          <button type="button" className="ap-btn ap-btn-cancel" onClick={() => handleCancel(song.id)}>
            <X size={14} /> Odustani
          </button>
        </>
      );
    }
    if (status === 'DENIED') {
      return (
        <button type="button" className="ap-btn ap-btn-denied" disabled>
          <Lock size={14} /> Odbijeno
        </button>
      );
    }
    return (
      <button type="button" className="ap-btn ap-btn-request" disabled={requesting === song.id} onClick={() => handleRequest(song.id)}>
        <ShoppingBag size={14} /> {requesting === song.id ? 'Šaljem…' : 'Kupi'}
      </button>
    );
  };

  const renderPaymentInfo = (song) => {
    const status = accessMap[song.id];
    if (status === 'APPROVED') {
      return (
        <div className="ap-payment-box">
          <div className="ap-payment-label">✓ Zahtev odobren — uputstvo za uplatu</div>
          <div className="ap-payment-details">
            <p>Uplatite iznos od <strong>{song.price || 'po dogovoru'} RSD</strong> na račun:</p>
            <p><strong>265-1234567-89</strong></p>
            <p>Svrha uplate: <strong>Autorska pesma — {song.title}</strong></p>
            <p>Poziv na broj: <strong>vaš email</strong></p>
            <p className="ap-payment-note">Nakon uplate, admin će potvrditi i otvoriti vam pristup za preuzimanje.</p>
          </div>
        </div>
      );
    }
    if (status === 'PAID') {
      return (
        <div className="ap-payment-box ap-payment-success">
          <div className="ap-payment-label">✓ Uplata potvrđena</div>
          <div className="ap-payment-details">
            <p>Pesma je vaša! Kliknite <strong>Preuzmi</strong> za download.</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="ap-wrap container">
      <div className="ap-back">
        <Link href="/bands" className="ap-back-link"><ArrowLeft size={16} /> Nazad</Link>
      </div>

      <header className="ap-hero">
        <h1>Autorske Pesme</h1>
        <p>Originalne kompozicije zaštićene autorskim pravima. Preslušajte demo — kupite licencu.</p>
        <div className="ap-share">
          <span className="ap-share-label"><Share2 size={13} /> Podeli ponudu:</span>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} target="_blank" rel="noopener noreferrer" className="ap-share-btn ap-share-fb" title="Podeli na Facebook">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </a>
          <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Pogledajte autorske pesme u ponudi! ' + (typeof window !== 'undefined' ? window.location.href : ''))}`} target="_blank" rel="noopener noreferrer" className="ap-share-btn ap-share-wa" title="Podeli na WhatsApp">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </a>
          <a href={`viber://forward?text=${encodeURIComponent('Pogledajte autorske pesme u ponudi! ' + (typeof window !== 'undefined' ? window.location.href : ''))}`} className="ap-share-btn ap-share-viber" title="Podeli na Viber">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.4 0C9.473.028 5.333.344 3.02 2.467 1.302 4.187.541 6.756.457 9.919c-.084 3.163-.192 9.097 5.564 10.655h.005l-.005 2.427s-.037.982.61 1.182c.783.242 1.243-.504 1.993-1.308.411-.44.979-1.087 1.407-1.581 3.882.326 6.867-.418 7.207-.537.784-.273 5.217-.823 5.938-6.716.744-6.07-.354-9.912-2.34-11.633C18.986 1.043 14.968.06 11.4 0zm.36 1.9c3.2.044 6.733.848 8.277 2.126 1.666 1.433 2.61 4.873 1.97 10.094-.584 4.77-4.143 5.183-4.8 5.413-.283.099-2.832.734-5.997.537 0 0-2.375 2.866-3.118 3.617-.116.118-.268.165-.364.142-.135-.032-.171-.19-.17-.42.002-.336.02-4.17.02-4.17C2.83 18.023 2.89 13.04 2.96 10.36c.07-2.68.689-4.85 2.1-6.199 1.989-1.793 5.55-2.235 6.7-2.26zM12.2 4.9c-.1 0-.198.085-.193.2.005.113.094.193.194.193.89.023 1.677.326 2.29.837.614.512.978 1.195 1.09 2.098.013.11.103.186.207.186h.006a.197.197 0 00.19-.213c-.13-1.037-.556-1.848-1.277-2.449-.72-.601-1.627-.93-2.506-.852zm-1.456.69a.197.197 0 00-.083.397c1.698.337 3.058 1.482 3.72 3.127a.196.196 0 00.253.116.197.197 0 00.115-.253c-.72-1.793-2.203-3.043-4.005-3.387zm-.066 1.79a.198.198 0 00-.049.39c1.072.184 1.876.836 2.334 1.78a.197.197 0 00.354-.173c-.516-1.062-1.43-1.804-2.64-2.006zM9.22 7.13c-.23-.014-.45.05-.612.21l-.395.37c-.27.26-.318.66-.175.99.51 1.18 1.274 2.24 2.286 3.19.092.086.187.17.284.25.94.87 2.005 1.548 3.22 1.96.344.118.735.04.977-.226l.335-.41c.207-.253.185-.567-.057-.762l-1.164-.887c-.223-.153-.503-.13-.692.048l-.38.348c-.102.094-.242.11-.365.05L12.3 12.13c-.673-.381-1.235-.877-1.672-1.503l-.077-.13c-.066-.118-.053-.26.04-.36l.33-.393c.168-.197.175-.476.01-.687l-.954-1.14c-.13-.175-.312-.28-.517-.29h-.024z"/></svg>
          </a>
          <button type="button" className="ap-share-btn ap-share-copy" title="Kopiraj link" onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link kopiran!'); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
        </div>
      </header>

      <div className="ap-toolbar">
        <div className="ap-search">
          <Search size={16} />
          <input type="text" placeholder="Pretraži pesme..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {categories.length > 0 && (
          <div className="ap-filters">
            <button type="button" className={`ap-filter ${!activeCategory ? 'active' : ''}`} onClick={() => setActiveCategory('')}>Sve</button>
            {categories.map((cat) => (
              <button key={cat} type="button" className={`ap-filter ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>{cat}</button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="ap-loading"><div className="ap-spinner" /><p>Učitavanje...</p></div>
      ) : filtered.length === 0 ? (
        <div className="ap-loading"><Music size={28} /><p>{searchTerm ? 'Nema rezultata.' : 'Nema pesama u ponudi.'}</p></div>
      ) : (
        <div className="ap-grid">
          {filtered.map((song) => (
            <div key={song.id} className="ap-card">
              <div className="ap-card-top">
                <div className="ap-card-info">
                  <h3>{song.title}</h3>
                  <span className="ap-artist">{song.artist}</span>
                </div>
                <div className="ap-card-meta">
                  {song.category && <span className="ap-cat">{song.category}</span>}
                  <span className="ap-price">{song.price ? `${song.price} RSD` : 'Na upit'}</span>
                </div>
              </div>
              {song.description && <p className="ap-desc">{song.description}</p>}
              <div className="ap-card-bottom">
                <div className="ap-btns-left">
                  {song.hasPreview && (
                    <button
                      type="button"
                      className={`ap-btn ap-btn-play ${playingId === song.id ? 'playing' : ''}`}
                      onClick={() => playPreview(song.id)}
                      disabled={audioLoading === song.id}
                    >
                      {audioLoading === song.id ? <span className="ap-spin-sm" /> : playingId === song.id ? <Pause size={14} /> : <Play size={14} />}
                      {playingId === song.id ? 'Stop' : 'Demo'}
                    </button>
                  )}
                </div>
                <div className="ap-btns-right">
                  {renderBuyBtn(song)}
                </div>
              </div>
              {renderPaymentInfo(song)}
            </div>
          ))}
        </div>
      )}

      {purchasedSongs.length > 0 && (
        <div className="ap-purchased">
          <h2 className="ap-purchased-title">Moje kupljene pesme</h2>
          <div className="ap-grid">
            {purchasedSongs.map((song) => (
              <div key={song.id} className="ap-card ap-card-purchased">
                <div className="ap-card-top">
                  <div className="ap-card-info">
                    <h3>{song.title}</h3>
                    <span className="ap-artist">{song.artist}</span>
                  </div>
                  <span className="ap-purchased-badge">✓ Kupljeno</span>
                </div>
                <div className="ap-card-bottom">
                  <button type="button" className="ap-btn ap-btn-download" onClick={() => handleDownload(song.id)}>
                    <Download size={14} /> Preuzmi
                  </button>
                  <button type="button" className="ap-btn ap-btn-lyrics-btn" onClick={() => handleDownload(song.id)}>
                    <FileText size={14} /> Tekst
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {lyricsModal && (
        <div className="ap-modal-overlay" onClick={() => setLyricsModal(null)}>
          <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-header">
              <div>
                <h2>{lyricsModal.title}</h2>
                <span className="ap-modal-artist">{lyricsModal.artist}</span>
              </div>
              <button type="button" className="ap-modal-close" onClick={() => setLyricsModal(null)}><X size={20} /></button>
            </div>
            <pre className="ap-modal-lyrics">{lyricsModal.lyrics}</pre>
            <div className="ap-modal-footer">
              <button type="button" className="ap-btn ap-btn-download" onClick={() => { window.open(lyricsModal.url, '_blank'); }}>
                <Download size={14} /> Preuzmi MP3
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .ap-wrap { padding: 1.5rem 0; padding-bottom: max(3rem, env(safe-area-inset-bottom)); min-height: 100dvh; }
        .ap-back { margin-bottom: 1rem; }
        .ap-back-link { display: inline-flex; align-items: center; gap: 4px; color: #64748b; font-size: 0.82rem; font-weight: 600; text-decoration: none; }
        .ap-back-link:hover { color: #e2e8f0; }
        .ap-hero { text-align: center; margin-bottom: 1.5rem; }
        .ap-hero h1 { font-size: clamp(1.5rem, 4vw, 2.2rem); font-weight: 800; color: #fff; margin: 0 0 0.4rem; letter-spacing: -0.02em; }
        .ap-hero p { color: #94a3b8; font-size: 0.9rem; margin: 0; }
        .ap-share { display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem; justify-content: center; flex-wrap: wrap; }
        .ap-share-label { font-size: 0.72rem; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 4px; }
        .ap-share-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #94a3b8; text-decoration: none; cursor: pointer; transition: 0.15s; }
        .ap-share-btn:hover { transform: scale(1.1); }
        .ap-share-fb:hover { background: rgba(24,119,242,0.15); color: #1877f2; border-color: rgba(24,119,242,0.3); }
        .ap-share-wa:hover { background: rgba(37,211,102,0.15); color: #25d366; border-color: rgba(37,211,102,0.3); }
        .ap-share-viber:hover { background: rgba(121,97,177,0.15); color: #7961b1; border-color: rgba(121,97,177,0.3); }
        .ap-share-copy:hover { background: rgba(99,102,241,0.15); color: #818cf8; border-color: rgba(99,102,241,0.3); }
        .ap-toolbar { max-width: 600px; margin: 0 auto 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .ap-search { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 1rem; background: rgba(15,23,42,0.8); border: 1px solid rgba(99,102,241,0.12); border-radius: 50px; color: #64748b; }
        .ap-search:focus-within { border-color: rgba(99,102,241,0.4); box-shadow: 0 0 0 2px rgba(99,102,241,0.08); }
        .ap-search input { background: none; border: none; color: #f1f5f9; width: 100%; outline: none; font-size: 16px; }
        .ap-search input::placeholder { color: #475569; }
        .ap-filters { display: flex; gap: 0.3rem; overflow-x: auto; -webkit-overflow-scrolling: touch; justify-content: center; }
        .ap-filter { background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.06); color: #94a3b8; padding: 0.35rem 0.75rem; border-radius: 50px; cursor: pointer; font-weight: 700; font-size: 0.7rem; white-space: nowrap; transition: 0.15s; }
        .ap-filter:hover { color: #e2e8f0; background: rgba(99,102,241,0.06); }
        .ap-filter.active { background: #6366f1; color: #fff; border-color: #6366f1; }
        .ap-grid { display: flex; flex-direction: column; gap: 0.6rem; max-width: 650px; margin: 0 auto; }
        .ap-card { background: rgba(15,23,42,0.5); border: 1px solid rgba(99,102,241,0.06); border-radius: 12px; padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.6rem; transition: 0.15s; }
        .ap-card:hover { border-color: rgba(99,102,241,0.2); background: rgba(99,102,241,0.03); }
        .ap-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
        .ap-card-info h3 { margin: 0; font-size: 0.95rem; font-weight: 700; color: #f1f5f9; line-height: 1.2; }
        .ap-artist { font-size: 0.76rem; color: #64748b; }
        .ap-card-meta { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
        .ap-cat { font-size: 0.62rem; font-weight: 700; padding: 2px 7px; border-radius: 50px; background: rgba(99,102,241,0.1); color: #818cf8; }
        .ap-price { font-size: 0.85rem; font-weight: 800; color: #4ade80; white-space: nowrap; }
        .ap-desc { margin: 0; font-size: 0.78rem; color: #94a3b8; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .ap-card-bottom { display: flex; align-items: center; justify-content: space-between; }
        .ap-btns-left { display: flex; align-items: center; gap: 0.4rem; }
        .ap-btns-right { display: flex; align-items: center; gap: 0.4rem; }
        .ap-btn { display: inline-flex; align-items: center; gap: 5px; padding: 0.5rem 1rem; border-radius: 10px; font-weight: 700; font-size: 0.78rem; cursor: pointer; transition: 0.15s; min-height: 36px; border: 1px solid transparent; }
        .ap-btn-play { background: rgba(99,102,241,0.1); color: #818cf8; border-color: rgba(99,102,241,0.25); }
        .ap-btn-play:hover { background: rgba(99,102,241,0.18); border-color: #6366f1; }
        .ap-btn-play.playing { background: rgba(99,102,241,0.2); color: #a5b4fc; border-color: #6366f1; }
        .ap-btn-play:disabled { opacity: 0.5; cursor: wait; }
        .ap-btn-request { background: rgba(34,197,94,0.1); color: #4ade80; border-color: rgba(34,197,94,0.25); }
        .ap-btn-request:hover { background: rgba(34,197,94,0.2); border-color: #22c55e; }
        .ap-btn-request:disabled { opacity: 0.5; cursor: wait; }
        .ap-btn-pending { background: rgba(99,102,241,0.08); color: #a5b4fc; border-color: rgba(99,102,241,0.2); opacity: 0.8; cursor: default; }
        .ap-btn-approved { background: rgba(251,191,36,0.1); color: #fbbf24; border-color: rgba(251,191,36,0.25); cursor: default; }
        .ap-btn-denied { background: rgba(248,113,113,0.08); color: #f87171; border-color: rgba(248,113,113,0.2); opacity: 0.7; cursor: default; }
        .ap-btn-cancel { background: rgba(248,113,113,0.08); color: #f87171; border-color: rgba(248,113,113,0.2); }
        .ap-btn-cancel:hover { background: rgba(248,113,113,0.18); border-color: #ef4444; }
        .ap-btn-download { background: rgba(34,197,94,0.1); color: #4ade80; border-color: rgba(34,197,94,0.25); }
        .ap-btn-download:hover { background: rgba(34,197,94,0.2); border-color: #22c55e; }
        .ap-payment-box { margin-top: 0.3rem; padding: 0.75rem 1rem; border-radius: 10px; background: rgba(34,197,94,0.04); border: 1px solid rgba(34,197,94,0.15); }
        .ap-payment-box.ap-payment-success { background: rgba(34,197,94,0.06); border-color: rgba(34,197,94,0.25); }
        .ap-payment-label { font-size: 0.72rem; font-weight: 800; color: #4ade80; margin-bottom: 0.4rem; }
        .ap-payment-details p { margin: 0.2rem 0; font-size: 0.8rem; color: #cbd5e1; line-height: 1.5; }
        .ap-payment-note { margin-top: 0.5rem !important; font-size: 0.72rem !important; color: #94a3b8 !important; font-style: italic; }
        .ap-btn-lyrics-btn { background: rgba(139,92,246,0.1); color: #a78bfa; border-color: rgba(139,92,246,0.25); }
        .ap-btn-lyrics-btn:hover { background: rgba(139,92,246,0.2); border-color: #8b5cf6; }
        .ap-purchased { margin-top: 2.5rem; max-width: 650px; margin-left: auto; margin-right: auto; }
        .ap-purchased-title { font-size: 1rem; font-weight: 800; color: #4ade80; margin: 0 0 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(34,197,94,0.15); }
        .ap-card-purchased { border-color: rgba(34,197,94,0.15); }
        .ap-card-purchased:hover { border-color: rgba(34,197,94,0.3); }
        .ap-purchased-badge { font-size: 0.68rem; font-weight: 800; color: #4ade80; background: rgba(34,197,94,0.1); padding: 2px 8px; border-radius: 50px; }
        .ap-loading { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 3rem; color: #64748b; }
        .ap-spinner { width: 28px; height: 28px; border: 3px solid #334155; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.6s linear infinite; }
        .ap-spin-sm { width: 12px; height: 12px; border: 2px solid rgba(99,102,241,0.3); border-top-color: #818cf8; border-radius: 50%; animation: spin 0.5s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ap-modal-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .ap-modal { background: #1e293b; border: 1px solid rgba(99,102,241,0.15); border-radius: 16px; max-width: 550px; width: 100%; max-height: 80vh; display: flex; flex-direction: column; }
        .ap-modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 1.25rem 1.25rem 0.75rem; }
        .ap-modal-header h2 { margin: 0; font-size: 1.1rem; color: #f1f5f9; }
        .ap-modal-artist { font-size: 0.82rem; color: #64748b; }
        .ap-modal-close { background: none; border: none; color: #64748b; cursor: pointer; padding: 4px; }
        .ap-modal-close:hover { color: #f1f5f9; }
        .ap-modal-lyrics { flex: 1; overflow-y: auto; padding: 0 1.25rem; margin: 0; font-family: inherit; font-size: 0.88rem; color: #cbd5e1; line-height: 1.7; white-space: pre-wrap; }
        .ap-modal-footer { padding: 1rem 1.25rem; border-top: 1px solid rgba(255,255,255,0.06); display: flex; gap: 0.5rem; }
        /* Mobile — phones */
        @media (max-width: 640px) {
          .ap-wrap { padding-left: max(0.75rem, env(safe-area-inset-left)); padding-right: max(0.75rem, env(safe-area-inset-right)); }
          .ap-hero h1 { font-size: 1.4rem; }
          .ap-hero p { font-size: 0.82rem; }
          .ap-grid { gap: 0.5rem; }
          .ap-card { padding: 0.85rem; }
          .ap-card-bottom { flex-wrap: wrap; gap: 0.5rem; }
          .ap-btns-left, .ap-btns-right { flex: 1; }
          .ap-btns-right { justify-content: flex-end; }
          .ap-btn { min-height: 44px; justify-content: center; }
          .ap-filters { justify-content: flex-start; padding-bottom: 0.3rem; }
          .ap-filter { padding: 0.4rem 0.85rem; min-height: 36px; display: flex; align-items: center; }
          .ap-modal { max-height: 90dvh; border-radius: 12px; margin: env(safe-area-inset-top, 0px) 0.5rem env(safe-area-inset-bottom, 0px); }
          .ap-modal-overlay { padding: 0.5rem; }
          .ap-modal-lyrics { font-size: 0.84rem; -webkit-overflow-scrolling: touch; }
          .ap-modal-footer { padding: 0.85rem 1rem; }
        }
        /* Small phones — iPhone SE, etc */
        @media (max-width: 380px) {
          .ap-hero h1 { font-size: 1.2rem; }
          .ap-card-info h3 { font-size: 0.85rem; }
          .ap-price { font-size: 0.72rem; }
        }
        /* Tablet */
        @media (min-width: 641px) and (max-width: 1024px) {
          .ap-grid { max-width: 600px; }
          .ap-btn { min-height: 38px; }
        }
      `}</style>
    </div>
  );
}
