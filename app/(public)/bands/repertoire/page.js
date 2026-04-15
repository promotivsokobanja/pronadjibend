'use client';
import { Music, Search, Plus, Trash2, ArrowLeft, Edit2, X, FileText } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const normalizeValue = (value) => String(value || '').trim().toLowerCase();

const buildSongKey = (song) => `${normalizeValue(song?.title)}::${normalizeValue(song?.artist)}`;

const splitSongLine = (line) => {
  const cleaned = String(line || '').trim();
  if (!cleaned) return { raw: '', title: '', artist: '' };

  const separators = [' - ', ' – ', ' — '];
  for (const separator of separators) {
    if (cleaned.includes(separator)) {
      const [titlePart, ...artistParts] = cleaned.split(separator);
      return {
        raw: cleaned,
        title: titlePart.trim(),
        artist: artistParts.join(separator).trim(),
      };
    }
  }

  return { raw: cleaned, title: cleaned, artist: '' };
};

const parseSongList = (value) => {
  const seen = new Set();
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(Boolean)
    .filter((line) => {
      const parsed = splitSongLine(line);
      const key = `${normalizeValue(parsed.title)}::${normalizeValue(parsed.artist)}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const findBestSongMatch = (line, songs, ownerSongKeySet) => {
  const parsed = splitSongLine(line);
  const normalizedTitle = normalizeValue(parsed.title);
  const normalizedArtist = normalizeValue(parsed.artist);
  if (!normalizedTitle) return null;

  const exactTitleArtist = normalizedArtist
    ? songs.find((song) => normalizeValue(song.title) === normalizedTitle && normalizeValue(song.artist) === normalizedArtist)
    : null;

  const titleArtistContains = exactTitleArtist || (normalizedArtist
    ? songs.find((song) => {
        const title = normalizeValue(song.title);
        const artist = normalizeValue(song.artist);
        return title === normalizedTitle && artist.includes(normalizedArtist);
      })
    : null);

  const exact = titleArtistContains || songs.find((song) => {
    const title = normalizeValue(song.title);
    const artist = normalizeValue(song.artist);
    return title === normalizedTitle || `${title} - ${artist}` === `${normalizedTitle} - ${normalizedArtist}` || `${title} ${artist}` === `${normalizedTitle} ${normalizedArtist}`;
  });

  const partial = exact || songs.find((song) => {
    const title = normalizeValue(song.title);
    const artist = normalizeValue(song.artist);
    if (normalizedArtist) {
      return (
        (title.includes(normalizedTitle) || normalizedTitle.includes(title)) &&
        (artist.includes(normalizedArtist) || normalizedArtist.includes(artist))
      );
    }
    return title.includes(normalizedTitle) || normalizedTitle.includes(title) || `${title} - ${artist}`.includes(normalizedTitle);
  });

  if (!partial) return null;
  return {
    song: partial,
    alreadyInRepertoire: ownerSongKeySet.has(buildSongKey(partial)),
  };
};

export default function RepertoirePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Muške Zabavne');
  const [songs, setSongs] = useState([]);
  const [counts, setCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [globalMatches, setGlobalMatches] = useState([]);
  const [bandId, setBandId] = useState(null);
  const [musicianId, setMusicianId] = useState(null);
  const [showGlobalDropdown, setShowGlobalDropdown] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkSongList, setBulkSongList] = useState('');
  const [bulkImportMatches, setBulkImportMatches] = useState([]);
  const [bulkImportMissing, setBulkImportMissing] = useState([]);
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  const [bulkImportSaving, setBulkImportSaving] = useState(false);
  const ownerId = bandId || musicianId;
  const searchBoxRef = useRef(null);
  const dashboardHref = musicianId ? '/muzicari/profil' : '/bands';

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!r.ok) return;
        const { user } = await r.json();
        if (user?.bandId) setBandId(user.bandId);
        else if (user?.musicianProfileId) setMusicianId(user.musicianProfileId);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const fetchData = useCallback(async () => {
    if (!ownerId) {
      setSongs([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const params = { category: activeTab, search: searchTerm };
      if (bandId) params.bandId = bandId;
      else if (musicianId) params.musicianId = musicianId;
      const qs = new URLSearchParams(params).toString();
      const resp = await fetch(`/api/songs?${qs}`, { cache: 'no-store' });
      const data = await resp.json();
      setSongs(Array.isArray(data) ? data : []);

      if (searchTerm.trim().length > 1 && Array.isArray(data)) {
        const globalParams = new URLSearchParams({
          category: activeTab,
          search: searchTerm.trim(),
          limit: '20',
        }).toString();
        const globalResp = await fetch(`/api/songs?${globalParams}`, { cache: 'no-store' });
        const globalData = await globalResp.json();
        const ownerSongKeys = new Set(
          data.map((existing) => `${String(existing.title || '').trim().toLowerCase()}::${String(existing.artist || '').trim().toLowerCase()}`)
        );
        const matches = Array.isArray(globalData)
          ? globalData.filter((song) => {
              const key = `${String(song.title || '').trim().toLowerCase()}::${String(song.artist || '').trim().toLowerCase()}`;
              return !ownerSongKeys.has(key);
            })
          : [];
        setGlobalMatches(matches);
      } else {
        setGlobalMatches([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [ownerId, bandId, musicianId, activeTab, searchTerm]);

  const fetchCounts = useCallback(async () => {
    if (!ownerId) return;
    try {
      const countParam = bandId ? `bandId=${encodeURIComponent(bandId)}` : `musicianId=${encodeURIComponent(musicianId)}`;
      const resp = await fetch(`/api/songs/counts?${countParam}`, { cache: 'no-store' });
      const data = await resp.json();
      setCounts(typeof data === 'object' && data && !data.error ? data : {});
    } catch (err) {
      console.error(err);
    }
  }, [ownerId, bandId, musicianId]);

  const handleQuickAdd = async (masterSong) => {
    if (!ownerId) return;
    try {
      const body = {
        title: masterSong.title,
        artist: masterSong.artist,
        category: masterSong.type,
        type: 'Standard',
      };
      if (bandId) body.bandId = bandId;
      else if (musicianId) body.musicianId = musicianId;
      const resp = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (resp.ok) {
        fetchData();
        fetchCounts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetBulkImportState = useCallback(() => {
    setBulkSongList('');
    setBulkImportMatches([]);
    setBulkImportMissing([]);
    setBulkImportLoading(false);
    setBulkImportSaving(false);
  }, []);

  const handleBulkFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setBulkSongList((prev) => {
        const next = text.trim();
        if (!prev.trim()) return next;
        return `${prev.trim()}\n${next}`;
      });
    } catch {
      alert('Fajl nije moguće pročitati. Koristite .txt dokument.');
    } finally {
      event.target.value = '';
    }
  };

  const handleAnalyzeBulkList = async () => {
    const entries = parseSongList(bulkSongList);
    if (entries.length === 0) {
      alert('Unesite barem jedan naziv pesme ili učitajte .txt spisak.');
      return;
    }

    setBulkImportLoading(true);
    try {
      const resp = await fetch('/api/songs/match-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: entries }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Greška');

      const matches = [];
      const missing = [];

      for (const item of data.results) {
        if (item.status === 'found' && item.match) {
          matches.push({
            input: item.input,
            song: item.match,
            alreadyInRepertoire: item.alreadyInRepertoire,
          });
        } else {
          missing.push({
            input: item.input,
            cleaned: item.cleaned,
            parsedTitle: item.parsedTitle,
            parsedArtist: item.parsedArtist,
          });
        }
      }

      setBulkImportMatches(matches);
      setBulkImportMissing(missing);
    } catch (err) {
      console.error(err);
      alert('Analiza spiska nije uspela. Pokušajte ponovo.');
    } finally {
      setBulkImportLoading(false);
    }
  };

  const handleBulkImportSave = async (includeMissing = false) => {
    const pendingMatches = bulkImportMatches.filter((item) => !item.alreadyInRepertoire);
    const missingToAdd = includeMissing ? bulkImportMissing : [];

    if (pendingMatches.length === 0 && missingToAdd.length === 0) {
      alert('Nema pesama za dodavanje.');
      return;
    }

    setBulkImportSaving(true);
    try {
      const songsToImport = [
        ...pendingMatches.map(({ song }) => ({
          title: song.title,
          artist: song.artist,
          category: song.category,
          type: song.type,
          sourceSongId: song.id,
        })),
        ...missingToAdd.map((item) => ({
          title: item.parsedTitle || item.cleaned,
          artist: item.parsedArtist || '',
        })),
      ];

      const resp = await fetch('/api/songs/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: songsToImport }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || 'Masovni unos nije uspeo.');
      }

      const result = await resp.json();
      await Promise.all([fetchData(), fetchCounts()]);
      setShowBulkImportModal(false);
      resetBulkImportState();
      if (result.imported > 0 || result.skipped > 0) {
        alert(`Uvezeno: ${result.imported}, preskočeno (duplikati): ${result.skipped}`);
      }
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Masovni unos nije uspeo.');
    } finally {
      setBulkImportSaving(false);
    }
  };

  useEffect(() => {
    if (ownerId) fetchCounts();
  }, [ownerId, fetchCounts]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setShowGlobalDropdown(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  useEffect(() => {
    if (searchTerm.trim().length > 1) {
      setShowGlobalDropdown(true);
      return;
    }
    setShowGlobalDropdown(false);
  }, [searchTerm]);

  useEffect(() => {
    if (!showBulkImportModal) return;
    const ownerSongKeySet = new Set(songs.map((song) => buildSongKey(song)));
    setBulkImportMatches((prev) => prev.map((item) => ({
      ...item,
      alreadyInRepertoire: ownerSongKeySet.has(buildSongKey(item.song)),
    })));
  }, [songs, showBulkImportModal]);

  const categories = ['Muške Zabavne', 'Ženske Zabavne', 'Muške Narodne', 'Ženske Narodne', 'Starije Zabavne'];

  const removeSong = async (id) => {
    if (!confirm('Da li ste sigurni da želite da obrišete ovu pesmu?')) return;

    const previousSongs = songs;
    setSongs((prev) => prev.filter((s) => s.id !== id));

    try {
      const qs = bandId ? `?bandId=${encodeURIComponent(bandId)}` : musicianId ? `?musicianId=${encodeURIComponent(musicianId)}` : '';
      const resp = await fetch(`/api/songs/${encodeURIComponent(id)}${qs}`, {
        method: 'DELETE',
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        throw new Error(data?.error || 'Brisanje pesme nije uspelo.');
      }

      fetchCounts();
    } catch (err) {
      console.error(err);
      setSongs(previousSongs);
      alert(err?.message || 'Greška pri brisanju pesme.');
    }
  };

  return (
    <div className="repertoire-container container">
      <div className="blob" style={{ top: '10%', right: '0' }}></div>
      <header className="page-header">
        <button
          type="button"
          className="back-link"
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push(dashboardHref);
            }
          }}
        >
          <ArrowLeft size={14} /> NAZAD
        </button>
        <div className="title-section">
          <h1>Upravljanje <span className="gradient-text">Repertoarom</span></h1>
          <p className="text-muted">Personalizovana baza pesama. Kliknite na ime za brzi pregled.</p>
        </div>
        <div className="header-actions">
          <div className="search-box-wrap" ref={searchBoxRef}>
            <div className="search-box">
              <Search size={18} aria-hidden />
              <input 
                type="text" 
                placeholder="Pretraži globalnu bazu..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                onFocus={() => {
                  if (searchTerm.trim().length > 1) setShowGlobalDropdown(true);
                }}
              />
            </div>
            {showGlobalDropdown && searchTerm.trim().length > 1 && (
              <div className="global-dropdown">
                <div className="global-dropdown-head">
                  <span>Glavna pesmarica</span>
                  <span>{globalMatches.length}</span>
                </div>
                <div className="global-dropdown-list">
                  {globalMatches.length > 0 ? (
                    globalMatches.map((m) => (
                      <button
                        key={`global-${m.id}`}
                        type="button"
                        className="global-dropdown-item"
                        onClick={() => handleQuickAdd(m)}
                      >
                        <span className="global-dropdown-copy">
                          <span className="global-dropdown-title">{m.title}</span>
                          <span className="global-dropdown-artist">{m.artist}</span>
                        </span>
                        <span className="global-dropdown-cta">Dodaj</span>
                      </button>
                    ))
                  ) : (
                    <div className="global-dropdown-empty">Nema rezultata u glavnoj pesmarici.</div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="header-cta-group">
            <button
              type="button"
              className="btn btn-secondary bulk-add-btn"
              onClick={() => setShowBulkImportModal(true)}
            >
              <FileText size={18} /> Dodaj listu pesama
            </button>
            <Link href="/bands/song/new">
              <button className="btn btn-primary"><Plus size={18} /> Dodaj Novu</button>
            </Link>
          </div>
        </div>
        <div className="gender-tabs-container">
          <div className="gender-tabs">
            {categories.map(cat => (
              <button 
                key={cat} 
                className={`tab-btn ${activeTab === cat ? 'active' : ''}`} 
                onClick={() => setActiveTab(cat)}
              >
                {cat} ({counts[cat] || 0})
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="repertoire-list glass-card">
        <div className="list-header desktop-only">
          <span className="col-title">PESMA I IZVOĐAČ</span>
          <span className="col-tonality">STATUS</span>
          <span className="col-genre">ŽANR</span>
          <span className="col-actions">UPRAVLJANJE</span>
        </div>
        
        <div className="song-rows">
          {isLoading ? (
            <div className="empty-state"><div className="loader"></div><p>Učitavanje baze...</p></div>
          ) : (
            <>
              {songs.length > 0 && (
                <div className="suggestions-divider repertoire-divider">
                  <span>Moj repertoar ({songs.length})</span>
                </div>
              )}

              {songs.map((song) => (
                <div key={song.id} className="song-row">
                  <div className="col-title">
                    <Link href={`/bands/song/${song.id}`}>
                      <p className="song-name clickable-title">{song.title}</p>
                    </Link>
                    <p className="song-artist">{song.artist || 'Evergreen / Folk'}</p>
                  </div>
                  <div className="col-tonality">
                    <Link href={`/bands/song/${song.id}`}>
                      <span className={`tonality-pill ${song.lyrics ? 'success' : 'warning'}`} style={{ cursor: 'pointer' }}>
                        {song.lyrics ? 'TEKST PRISUTAN' : 'BEZ TEKSTA'}
                      </span>
                    </Link>
                  </div>
                  <div className="col-genre"><span className="genre-label">{song.type || 'Standard'}</span></div>
                  <div className="col-actions">
                    <Link href={`/bands/song/${song.id}`} className="action-btn" title="Uredi"><Edit2 size={16} /></Link>
                    <button className="action-btn delete" onClick={() => removeSong(song.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              {songs.length === 0 && globalMatches.length === 0 && (
                <div className="empty-state">
                  <Music size={48} className="text-muted" />
                  <p>Nema pesama u ovoj kategoriji.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showBulkImportModal && (
        <div
          className="bulk-import-overlay"
          onClick={() => {
            if (bulkImportSaving) return;
            setShowBulkImportModal(false);
            resetBulkImportState();
          }}
        >
          <div className="bulk-import-modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="bulk-import-head">
              <div>
                <h2>Dodaj listu pesama</h2>
                <p>Unesi više naslova ili učitaj .txt spisak. Sistem će pronaći postojeće pesme i povući tekst gde ga baza već ima.</p>
              </div>
              <button
                type="button"
                className="bulk-import-close"
                onClick={() => {
                  if (bulkImportSaving) return;
                  setShowBulkImportModal(false);
                  resetBulkImportState();
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="bulk-import-grid">
              <div className="bulk-import-pane">
                <label className="bulk-import-label">Spisak pesama</label>
                <textarea
                  className="bulk-import-textarea"
                  placeholder={'Po jedan unos u redu, na primer:\nE draga, draga\nTiho noći - Zdravko Čolić\nLutka - S.A.R.S.'}
                  value={bulkSongList}
                  onChange={(e) => setBulkSongList(e.target.value)}
                />
                <div className="bulk-import-tools">
                  <label className="bulk-file-btn">
                    <input type="file" accept=".txt,text/plain" onChange={handleBulkFileChange} />
                    <span>Učitaj .txt</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAnalyzeBulkList}
                    disabled={bulkImportLoading}
                  >
                    {bulkImportLoading ? 'Analiziram...' : 'Analiziraj listu'}
                  </button>
                </div>
              </div>

              <div className="bulk-import-pane results">
                <label className="bulk-import-label">Rezultat</label>
                {bulkImportMatches.length === 0 && bulkImportMissing.length === 0 ? (
                  <div className="bulk-empty-state">Ovde će se pojaviti pronađene pesme i stavke koje nedostaju.</div>
                ) : (
                  <div className="bulk-result-stack">
                    {bulkImportMatches.length > 0 && (
                      <div className="bulk-result-card">
                        <div className="bulk-result-head">
                          <span>Pronađene u bazi</span>
                          <span>{bulkImportMatches.length}</span>
                        </div>
                        <div className="bulk-result-list">
                          {bulkImportMatches.map((item) => (
                            <div key={`${item.input}-${item.song.id}`} className="bulk-result-item">
                              <div>
                                <strong>{item.song.title}</strong>
                                <p>{item.song.artist}</p>
                              </div>
                              <span className={`bulk-status-pill ${item.alreadyInRepertoire ? 'existing' : 'ready'}`}>
                                {item.alreadyInRepertoire ? 'Već u repertoaru' : item.song.lyrics ? 'Spremno + tekst' : 'Spremno bez teksta'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {bulkImportMissing.length > 0 && (
                      <div className="bulk-result-card missing">
                        <div className="bulk-result-head">
                          <span>Nisu pronađene u pesmarici</span>
                          <span>{bulkImportMissing.length}</span>
                        </div>
                        <p className="bulk-missing-hint">Ove pesme će biti dodate samo sa naslovom (bez teksta) ako kliknete &quot;Dodaj sve&quot;.</p>
                        <div className="bulk-missing-list">
                          {bulkImportMissing.map((item) => (
                            <span key={item.input} className="bulk-missing-chip">{item.parsedTitle || item.cleaned}{item.parsedArtist ? ` — ${item.parsedArtist}` : ''}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bulk-import-footer">
              <div className="bulk-import-summary">
                <span>Pronađeno: {bulkImportMatches.filter((item) => !item.alreadyInRepertoire).length}</span>
                <span>Bez teksta: {bulkImportMissing.length}</span>
              </div>
              <div className="bulk-import-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    if (bulkImportSaving) return;
                    setShowBulkImportModal(false);
                    resetBulkImportState();
                  }}
                >
                  Otkaži
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleBulkImportSave(false)}
                  disabled={bulkImportSaving || bulkImportMatches.filter((item) => !item.alreadyInRepertoire).length === 0}
                >
                  {bulkImportSaving ? 'Dodajem...' : 'Dodaj pronađene'}
                </button>
                {bulkImportMissing.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleBulkImportSave(true)}
                    disabled={bulkImportSaving}
                  >
                    {bulkImportSaving ? 'Dodajem...' : 'Dodaj sve'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .repertoire-container { padding-top: 8rem; padding-bottom: 6rem; min-height: 100vh; overflow-x: clip; overflow-y: visible; box-sizing: border-box; width: 100%; position: relative; touch-action: pan-y pinch-zoom; }
        .page-header { margin-bottom: 4rem; position: relative; z-index: 2; }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #334155;
          font-weight: 800;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 2rem;
          padding: 0.45rem 0.7rem;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(255, 255, 255, 0.85);
          position: relative;
          z-index: 3;
          transition: 0.2s ease;
        }
        .back-link:hover { color: #0f172a; border-color: rgba(100, 116, 139, 0.75); }
        .title-section h1 { font-size: 3.5rem; font-weight: 800; margin-bottom: 1.5rem; letter-spacing: -2px; }
        .header-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 3rem; gap: 2rem; flex-wrap: wrap; }
        .header-cta-group { display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; }
        .search-box-wrap { position: relative; flex: 1; min-width: 300px; max-width: 500px; }
        .search-box { flex: 1; min-width: 300px; max-width: 500px; display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1.5rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 100px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); }
        .search-box input { background: none; border: none; color: #0f172a; width: 100%; outline: none; font-size: 0.95rem; font-weight: 600; }
                .search-box svg { color: #64748b; flex-shrink: 0; }
        .bulk-add-btn { background: rgba(255, 255, 255, 0.92); color: #4338ca; border: 1px solid rgba(99, 102, 241, 0.16); box-shadow: 0 10px 25px rgba(99, 102, 241, 0.12); }
        .global-dropdown { position: absolute; top: calc(100% + 0.7rem); left: 0; right: 0; z-index: 20; background: rgba(255, 255, 255, 0.98); border: 1px solid #e2e8f0; border-radius: 22px; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12); overflow: hidden; }
        .global-dropdown-head { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; padding: 0.9rem 1.15rem 0.75rem; border-bottom: 1px solid rgba(226, 232, 240, 0.9); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; }
        .global-dropdown-list { max-height: min(52vh, 420px); overflow-y: auto; }
        .global-dropdown-item { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; padding: 0.95rem 1.15rem; border: none; border-bottom: 1px solid rgba(226, 232, 240, 0.8); background: transparent; text-align: left; cursor: pointer; transition: background 0.18s ease; }
        .global-dropdown-item:last-child { border-bottom: none; }
        .global-dropdown-item:hover { background: rgba(99, 102, 241, 0.06); }
        .global-dropdown-copy { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
        .global-dropdown-title { font-size: 0.95rem; font-weight: 800; color: #0f172a; }
        .global-dropdown-artist { font-size: 0.78rem; color: #64748b; }
        .global-dropdown-cta { flex-shrink: 0; padding: 0.38rem 0.7rem; border-radius: 999px; border: 1px solid rgba(99, 102, 241, 0.22); background: rgba(99, 102, 241, 0.08); color: #6366f1; font-size: 0.72rem; font-weight: 800; }
        .global-dropdown-empty { padding: 1rem 1.15rem; color: #64748b; font-size: 0.86rem; }
        
        .gender-tabs-container { overflow-x: auto; margin-top: 2.5rem; padding-bottom: 1rem; -webkit-overflow-scrolling: touch; }
        .gender-tabs { display: flex; gap: 0.6rem; min-width: max-content; }
        .tab-btn { background: rgba(255,255,255,0.03); border: 1px solid var(--border); color: #888; padding: 0.6rem 1.25rem; border-radius: 100px; cursor: pointer; transition: 0.3s; font-weight: 700; font-size: 0.75rem; white-space: nowrap; }
        .tab-btn.active { background: var(--accent-primary); color: black; border-color: var(--accent-primary); }
        
        .repertoire-list { padding: 0; border: 1px solid var(--border); overflow: hidden; margin-top: 2rem; }
        .list-header { display: grid; grid-template-columns: 2fr 1fr 1fr 120px; padding: 1.5rem 2.5rem; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border); font-size: 0.7rem; font-weight: 800; color: #555; letter-spacing: 1.5px; }
        .song-row { display: grid; grid-template-columns: 2fr 1fr 1fr 120px; padding: 1.25rem 2.5rem; border-bottom: 1px solid var(--border); align-items: center; transition: 0.3s ease; }
        .song-name { font-size: 1.15rem; font-weight: 700; transition: 0.2s; }
        .clickable-title:hover { color: var(--accent-primary); }
        
        .suggestions-divider { padding: 1rem 2.5rem; background: rgba(16, 185, 129, 0.05); border-bottom: 1px solid rgba(16, 185, 129, 0.1); font-size: 0.65rem; font-weight: 800; color: var(--accent-primary); letter-spacing: 1px; text-transform: uppercase; }
        .repertoire-divider { background: rgba(99, 102, 241, 0.05); border-bottom-color: rgba(99, 102, 241, 0.12); color: #6366f1; }
        
        .tonality-pill { background: rgba(16, 185, 129, 0.1); color: var(--accent-primary); padding: 4px 12px; border-radius: 100px; font-size: 0.75rem; font-weight: 800; transition: 0.3s; }
        .tonality-pill.success { background: rgba(16, 185, 129, 0.1); color: var(--accent-primary); }
        .tonality-pill.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .tonality-pill.global { background: transparent; border: 1px solid var(--accent-primary); }
        
        .genre-label { font-size: 0.8rem; color: var(--text-muted); }
        .genre-label.glass { background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 4px; }
        
        .action-btn { color: #555; transition: 0.2s; padding: 8px; border-radius: 6px; }
        .action-btn:hover { color: white; background: rgba(255,255,255,0.05); }
        .action-btn.delete:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
        .bulk-import-overlay { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 80; background: rgba(15, 23, 42, 0.32); padding: 2rem; display: flex; align-items: center; justify-content: center; }
        .bulk-import-modal { width: min(1040px, 100%); max-height: calc(100vh - 4rem); overflow: auto; padding: 1.4rem; border: 1px solid rgba(226, 232, 240, 0.8); background: rgba(255, 255, 255, 0.97); }
        .bulk-import-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.2rem; }
        .bulk-import-head h2 { margin: 0 0 0.35rem; font-size: 1.45rem; color: #0f172a; }
        .bulk-import-head p { margin: 0; color: #64748b; max-width: 640px; }
        .bulk-import-close { border: 1px solid rgba(148, 163, 184, 0.35); background: #fff; color: #475569; border-radius: 12px; width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; }
        .bulk-import-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 1rem; }
        .bulk-import-pane { border: 1px solid rgba(226, 232, 240, 0.95); border-radius: 22px; padding: 1rem; background: rgba(248, 250, 252, 0.7); }
        .bulk-import-pane.results { background: rgba(255, 255, 255, 0.88); }
        .bulk-import-label { display: block; margin-bottom: 0.75rem; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; }
        .bulk-import-textarea { width: 100%; min-height: 290px; resize: vertical; border-radius: 18px; border: 1px solid #dbe2ea; padding: 1rem; background: #fff; color: #0f172a; outline: none; font-size: 0.95rem; line-height: 1.6; }
        .bulk-import-tools { margin-top: 0.9rem; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .bulk-file-btn { position: relative; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0.7rem 1rem; border-radius: 14px; background: #fff; border: 1px dashed rgba(99, 102, 241, 0.35); color: #4338ca; font-weight: 700; cursor: pointer; }
        .bulk-file-btn input { position: absolute; top: 0; right: 0; bottom: 0; left: 0; opacity: 0; cursor: pointer; }
        .bulk-empty-state { min-height: 290px; border-radius: 18px; border: 1px dashed rgba(148, 163, 184, 0.4); display: flex; align-items: center; justify-content: center; text-align: center; padding: 1rem; color: #64748b; background: rgba(248, 250, 252, 0.6); }
        .bulk-result-stack { display: flex; flex-direction: column; gap: 0.9rem; }
        .bulk-result-card { border: 1px solid rgba(226, 232, 240, 0.95); border-radius: 18px; overflow: hidden; background: #fff; }
        .bulk-result-card.missing { background: rgba(254, 242, 242, 0.55); }
        .bulk-result-head { display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1rem; border-bottom: 1px solid rgba(226, 232, 240, 0.9); font-size: 0.78rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; }
        .bulk-result-list { max-height: 340px; overflow: auto; }
        .bulk-result-item { display: flex; justify-content: space-between; align-items: center; gap: 0.85rem; padding: 0.9rem 1rem; border-bottom: 1px solid rgba(226, 232, 240, 0.8); }
        .bulk-result-item:last-child { border-bottom: none; }
        .bulk-result-item strong { display: block; color: #0f172a; }
        .bulk-result-item p { margin: 0.2rem 0 0; font-size: 0.82rem; color: #64748b; }
        .bulk-status-pill { flex-shrink: 0; padding: 0.42rem 0.7rem; border-radius: 999px; font-size: 0.72rem; font-weight: 800; }
        .bulk-status-pill.ready { background: rgba(16, 185, 129, 0.12); color: #047857; }
        .bulk-status-pill.existing { background: rgba(148, 163, 184, 0.14); color: #475569; }
        .bulk-missing-hint { margin: 0; padding: 0.5rem 1rem 0; font-size: 0.78rem; color: #92400e; font-style: italic; }
        .bulk-missing-list { display: flex; flex-wrap: wrap; gap: 0.6rem; padding: 1rem; }
        .bulk-missing-chip { display: inline-flex; align-items: center; padding: 0.45rem 0.7rem; border-radius: 999px; background: rgba(239, 68, 68, 0.08); color: #b91c1c; font-size: 0.8rem; font-weight: 700; }
        .bulk-import-footer { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(226, 232, 240, 0.9); flex-wrap: wrap; }
        .bulk-import-summary { display: flex; gap: 1rem; flex-wrap: wrap; color: #475569; font-size: 0.88rem; font-weight: 700; }
        .bulk-import-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .btn-ghost { background: rgba(255, 255, 255, 0.92); color: #334155; border: 1px solid rgba(148, 163, 184, 0.35); }

        @media (max-width: 968px) {
          .list-header { display: none; }
          .song-row {
            grid-template-columns: 1fr;
            gap: 0.75rem;
            padding: 1.15rem 1.1rem;
            align-items: stretch;
          }
          .title-section h1 { font-size: 2.5rem; }
          .header-actions { gap: 0.9rem; margin-top: 1.8rem; }
          .header-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .header-cta-group { width: 100%; }
          .header-cta-group :global(a) { flex: 1 1 220px; }
          .header-cta-group :global(a > button),
          .header-cta-group > button {
            width: 100%;
            justify-content: center;
          }
          .bulk-import-grid { grid-template-columns: 1fr; }
          .search-box-wrap,
          .search-box { min-width: 0; max-width: 100%; width: 100%; }
          .global-dropdown {
            position: static;
            margin-top: 0.65rem;
          }
          .col-tonality,
          .col-genre,
          .col-actions {
            display: flex;
            align-items: center;
            gap: 0.65rem;
            flex-wrap: wrap;
          }
          .col-actions {
            justify-content: flex-end;
          }
          .song-name { font-size: 1.02rem; }
          .song-artist { margin: 0.2rem 0 0; }
        }

        @media (max-width: 560px) {
          .repertoire-container { padding-top: 7.2rem; }
          .title-section h1 { font-size: 2rem; letter-spacing: -1px; margin-bottom: 0.9rem; }
          .header-actions :global(a),
          .header-actions :global(.btn) {
            width: 100%;
          }
          .header-cta-group { width: 100%; }
          .search-box {
            padding: 0.65rem 1rem;
            border-radius: 14px;
            gap: 0.7rem;
          }
          .global-dropdown { top: calc(100% + 0.45rem); border-radius: 16px; }
          .global-dropdown-item { padding: 0.85rem 0.9rem; align-items: flex-start; }
          .global-dropdown-title { font-size: 0.88rem; }
          .global-dropdown-artist { font-size: 0.74rem; }
          .bulk-import-overlay { padding: 0.75rem; }
          .bulk-import-modal { padding: 1rem; max-height: calc(100vh - 1.5rem); }
          .bulk-import-head h2 { font-size: 1.15rem; }
          .bulk-import-tools,
          .bulk-import-footer,
          .bulk-import-actions { flex-direction: column; align-items: stretch; }
          .bulk-result-item { align-items: flex-start; flex-direction: column; }
          .song-row {
            padding: 1.1rem 0.95rem;
            gap: 0.8rem;
          }
          .song-name { font-size: 1rem; }
          .song-row .col-actions {
            justify-content: space-between;
          }
          .tonality-pill,
          .genre-label {
            font-size: 0.72rem;
          }
          .action-btn {
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
}
