'use client';
import { Music, Search, Plus, Trash2, ArrowLeft, Edit2, X, FileText, Lock, FileDown } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import SongLyricsModal from '../../../../components/SongLyricsModal';
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
  const [userPlan, setUserPlan] = useState('BASIC');
  const [showGlobalDropdown, setShowGlobalDropdown] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkSongList, setBulkSongList] = useState('');
  const [bulkImportMatches, setBulkImportMatches] = useState([]);
  const [bulkImportMissing, setBulkImportMissing] = useState([]);
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  const [bulkImportSaving, setBulkImportSaving] = useState(false);
  const [bulkImportCategory, setBulkImportCategory] = useState('Muške Zabavne');
  const [isDeletingAllSongs, setIsDeletingAllSongs] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [openSongId, setOpenSongId] = useState(null);
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
        setUserPlan(String(user?.plan || 'BASIC').toUpperCase());
      } catch {
        /* ignore */
      } finally {
        setPageReady(true);
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
      const params = searchTerm.trim() ? { search: searchTerm.trim() } : { category: activeTab };
      if (bandId) params.bandId = bandId;
      else if (musicianId) params.musicianId = musicianId;
      const qs = new URLSearchParams(params).toString();
      const resp = await fetch(`/api/songs?${qs}`, { cache: 'no-store' });
      const data = await resp.json();
      setSongs(Array.isArray(data) ? data : []);

      if (searchTerm.trim().length > 1 && Array.isArray(data)) {
        const globalParams = new URLSearchParams({
          search: searchTerm.trim(),
          page: '1',
          suggest: '1',
        }).toString();
        const globalResp = await fetch(`/api/pesmarica?${globalParams}`, { cache: 'no-store' });
        const globalData = await globalResp.json();
        const ownerSongKeys = new Set(
          data.map((existing) => `${String(existing.title || '').trim().toLowerCase()}::${String(existing.artist || '').trim().toLowerCase()}`)
        );
        const allGlobal = Array.isArray(globalData?.songs) ? globalData.songs : [];
        const matches = allGlobal.filter((song) => {
              const key = `${String(song.title || '').trim().toLowerCase()}::${String(song.artist || '').trim().toLowerCase()}`;
              return !ownerSongKeys.has(key);
            });
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
        lyrics: masterSong.lyrics || '',
        category: masterSong.category || masterSong.type || '',
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
    setBulkImportCategory(activeTab);
  }, [activeTab]);

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
          category: bulkImportCategory,
          type: song.type,
          sourceSongId: song.id,
        })),
        ...missingToAdd.map((item) => ({
          title: item.parsedTitle || item.cleaned,
          artist: item.parsedArtist || '',
          category: bulkImportCategory,
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

  useEffect(() => {
    if (!showBulkImportModal) return;
    setBulkImportCategory(activeTab);
  }, [activeTab, showBulkImportModal]);

  const categories = ['Muške Zabavne', 'Ženske Zabavne', 'Muške Narodne', 'Ženske Narodne', 'Razno', 'Strane Muške', 'Strane Ženske'];

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

  const removeAllSongs = async () => {
    if (songs.length === 0) {
      alert('Lični repertoar je već prazan.');
      return;
    }

    if (!confirm('Da li ste sigurni da želite da obrišete ceo lični repertoar? Glavna pesmarica neće biti obrisana.')) {
      return;
    }

    if (!confirm('Potvrdite još jednom brisanje cele lične repertoar liste. Ova akcija se ne može vratiti.')) {
      return;
    }

    setIsDeletingAllSongs(true);
    try {
      const resp = await fetch('/api/songs', {
        method: 'DELETE',
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || 'Brisanje cele repertoar liste nije uspelo.');
      }

      await Promise.all([fetchData(), fetchCounts()]);
      alert(`Obrisano pesama: ${data.deleted || 0}`);
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Greška pri brisanju repertoara.');
    } finally {
      setIsDeletingAllSongs(false);
    }
  };

  const handleDownloadRepertoire = async () => {
    if (!ownerId) return;
    try {
      const ownerParam = bandId ? `bandId=${encodeURIComponent(bandId)}` : `musicianId=${encodeURIComponent(musicianId)}`;
      const [songsResp, profileResp] = await Promise.all([
        fetch(`/api/songs?${ownerParam}`, { cache: 'no-store' }),
        bandId ? fetch(`/api/bands/${bandId}`, { cache: 'no-store' }) : fetch(`/api/musicians/${musicianId}`, { cache: 'no-store' }),
      ]);
      const allSongs = await songsResp.json().then(d => Array.isArray(d) ? d : []);
      const profile = await profileResp.json().catch(() => ({}));
      const name = profile?.name || 'Moj repertoar';
      const city = profile?.city || '';
      const phone = profile?.phone || profile?.contactPhone || '';
      const email = profile?.email || profile?.contactEmail || '';

      const grouped = {};
      allSongs.forEach(s => {
        const cat = s.category || 'Ostalo';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(s);
      });

      const catOrder = ['Muške Zabavne', 'Ženske Zabavne', 'Muške Narodne', 'Ženske Narodne', 'Strane', 'Ostalo'];
      const sortedCats = Object.keys(grouped).sort((a, b) => {
        const ia = catOrder.indexOf(a), ib = catOrder.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });

      const today = new Date().toLocaleDateString('sr-RS');
      let lines = [];
      lines.push(`REPERTOAR — ${name}`);
      lines.push('='.repeat(40));
      if (city || phone || email) {
        const meta = [city, phone, email].filter(Boolean).join(' | ');
        lines.push(meta);
      }
      lines.push(`Ukupno pesama: ${allSongs.length}`);
      lines.push(`Datum: ${today}`);
      lines.push('');

      sortedCats.forEach(cat => {
        const catSongs = grouped[cat].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'sr'));
        lines.push('');
        lines.push(`── ${cat} (${catSongs.length}) ──`);
        lines.push('-'.repeat(30));
        catSongs.forEach((s, i) => {
          const artist = s.artist ? ` — ${s.artist}` : '';
          lines.push(`${String(i + 1).padStart(3)}. ${s.title || ''}${artist}`);
        });
      });

      lines.push('');
      lines.push('-'.repeat(40));
      lines.push(`PronadjiBend.rs | ${today}`);

      const text = lines.join('\n');
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Repertoar - ${name}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download repertoire error:', err);
      alert('Greška pri preuzimanju repertoara.');
    }
  };

  if (!pageReady) {
    return (
      <div className="repertoire-container container" style={{ paddingTop: '8rem', minHeight: '100vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', paddingTop: '6rem' }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>Učitavanje repertoara...</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

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
        <div className="search-row" ref={searchBoxRef}>
          <div className="search-box">
            <Search size={18} aria-hidden />
            <input 
              type="text" 
              placeholder="Pretraži pesme..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              onFocus={() => {
                if (searchTerm.trim().length > 1) setShowGlobalDropdown(true);
              }}
            />
            {searchTerm && (
              <button type="button" className="search-clear" onClick={() => { setSearchTerm(''); setShowGlobalDropdown(false); }}>
                <X size={14} />
              </button>
            )}
          </div>
          {showGlobalDropdown && searchTerm.trim().length > 1 && (
            <div className="global-dropdown">
              {songs.length > 0 && (
                <>
                  <div className="global-dropdown-head repertoire-section">
                    <span>Moj repertoar</span>
                    <span className="global-dropdown-count">{songs.length}</span>
                  </div>
                  <div className="global-dropdown-list">
                    {songs.map((s) => (
                      <div key={`rep-${s.id}`} className="global-dropdown-item">
                        <span className="global-dropdown-copy" style={{ cursor: 'pointer' }} onClick={() => { setOpenSongId(s.id); setShowGlobalDropdown(false); }}>
                          <span className="global-dropdown-title">{s.title}</span>
                          <span className="global-dropdown-artist">{s.artist || 'Evergreen / Folk'}</span>
                        </span>
                        <button
                          type="button"
                          className="global-dropdown-cta remove-cta"
                          onClick={() => removeSong(s.id)}
                        >
                          <Trash2 size={12} /> Izbaci
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className="global-dropdown-head">
                <span>Glavna pesmarica</span>
                <span className="global-dropdown-count">{globalMatches.length}</span>
              </div>
              <div className="global-dropdown-list">
                {globalMatches.length > 0 ? (
                  globalMatches.map((m) => (
                    <button
                      key={`global-${m.id}`}
                      type="button"
                      className="global-dropdown-item"
                      onClick={() => userPlan.startsWith('PREMIUM') ? handleQuickAdd(m) : router.push('/upgrade')}
                    >
                      <span className="global-dropdown-copy">
                        <span className="global-dropdown-title">{m.title}</span>
                        <span className="global-dropdown-artist">{m.artist}</span>
                      </span>
                      <span className="global-dropdown-cta add-cta">
                        {userPlan.startsWith('PREMIUM') ? <><Plus size={12} /> Dodaj</> : <Lock size={12} />}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="global-dropdown-empty">Nema rezultata u glavnoj pesmarici.</div>
                )}
              </div>
              {songs.length === 0 && globalMatches.length === 0 && (
                <div className="global-dropdown-empty">Nema rezultata ni u repertoaru ni u pesmarici.</div>
              )}
            </div>
          )}
        </div>

        <div className="toolbar">
          <div className="toolbar-left">
            <button
              type="button"
              className="toolbar-btn"
              onClick={handleDownloadRepertoire}
              disabled={!ownerId}
              title="Preuzmi repertoar za štampu"
            >
              <FileDown size={16} /> <span className="toolbar-label">Preuzmi</span>
            </button>
            <button
              type="button"
              className="toolbar-btn danger"
              onClick={removeAllSongs}
              disabled={isDeletingAllSongs || songs.length === 0}
            >
              <Trash2 size={16} /> <span className="toolbar-label">{isDeletingAllSongs ? 'Brišem...' : 'Obriši sve'}</span>
            </button>
          </div>
          <div className="toolbar-right">
            {userPlan.startsWith('PREMIUM') ? (
              <>
                <button
                  type="button"
                  className="toolbar-btn accent"
                  onClick={() => setShowBulkImportModal(true)}
                >
                  <FileText size={16} /> <span className="toolbar-label">Dodaj listu</span>
                </button>
                <Link href="/bands/song/new">
                  <button className="toolbar-btn primary"><Plus size={16} /> <span className="toolbar-label">Dodaj novu</span></button>
                </Link>
              </>
            ) : (
              <Link href="/upgrade">
                <button className="toolbar-btn primary" title="Dodavanje pesama zahteva Premium plan">
                  <Lock size={14} /> <span className="toolbar-label">Dodaj (Premium)</span>
                </button>
              </Link>
            )}
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
                    <p className="song-name clickable-title" onClick={() => setOpenSongId(song.id)} style={{ cursor: 'pointer' }}>{song.title}</p>
                    <p className="song-artist">{song.artist || 'Evergreen / Folk'}</p>
                  </div>
                  <div className="col-tonality">
                    <span className={`tonality-pill ${song.lyrics ? 'success' : 'warning'}`} style={{ cursor: 'pointer' }} onClick={() => setOpenSongId(song.id)}>
                      {song.lyrics ? 'TEKST PRISUTAN' : 'BEZ TEKSTA'}
                    </span>
                  </div>
                  <div className="col-genre"><span className="genre-label">{song.type || 'Standard'}</span></div>
                  <div className="col-actions">
                    <button className="action-btn" title="Uredi" onClick={() => setOpenSongId(song.id)}><Edit2 size={16} /></button>
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
                <div className="bulk-category-field">
                  <label htmlFor="bulk-category" className="bulk-category-label">Kategorija za unos</label>
                  <select
                    id="bulk-category"
                    className="bulk-category-select"
                    value={bulkImportCategory}
                    onChange={(e) => setBulkImportCategory(e.target.value)}
                    disabled={bulkImportSaving}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
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
                    {bulkImportLoading ? (
                      <>
                        <span className="btn-spinner" aria-hidden />
                        Analiziram listu...
                      </>
                    ) : 'Analiziraj listu'}
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
                                {item.alreadyInRepertoire ? 'Već u repertoaru' : item.song.hasLyrics ? 'Spremno + tekst' : 'Spremno bez teksta'}
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

      {openSongId && (
        <SongLyricsModal
          songId={openSongId}
          onClose={() => setOpenSongId(null)}
          bandId={bandId}
          musicianId={musicianId}
        />
      )}

      <style jsx>{`
        /* ─── Layout ─── */
        .repertoire-container { padding-top: 7.5rem; padding-bottom: 6rem; min-height: 100vh; overflow-x: clip; overflow-y: visible; box-sizing: border-box; width: 100%; position: relative; touch-action: pan-y pinch-zoom; }
        .page-header { margin-bottom: 2rem; position: relative; z-index: 2; }
        .back-link {
          display: inline-flex; align-items: center; gap: 0.4rem;
          color: rgba(226, 232, 240, 0.7); font-weight: 800; font-size: 0.72rem;
          text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1.5rem;
          padding: 0.4rem 0.65rem; border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.04);
          transition: 0.2s ease; cursor: pointer;
        }
        .back-link:hover { color: #f8fafc; border-color: rgba(139, 92, 246, 0.4); background: rgba(139, 92, 246, 0.06); }
        .title-section { margin-bottom: 1.8rem; }
        .title-section h1 { font-size: 2.8rem; font-weight: 800; margin-bottom: 0.6rem; letter-spacing: -1.5px; line-height: 1.1; }
        .title-section .text-muted { font-size: 0.88rem; color: #64748b; }

        /* ─── Search ─── */
        .search-row { position: relative; margin-bottom: 1rem; }
        .search-box {
          display: flex; align-items: center; gap: 0.85rem;
          padding: 0.7rem 1.25rem; background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px;
          transition: border-color 0.2s;
        }
        .search-box:focus-within { border-color: rgba(139, 92, 246, 0.45); }
        .search-box input { background: none; border: none; color: #f8fafc; width: 100%; outline: none; font-size: 0.95rem; font-weight: 600; }
        .search-box input::placeholder { color: #475569; }
        .search-box svg { color: #64748b; flex-shrink: 0; }
        .search-clear { background: none; border: none; color: #64748b; cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: 0.15s; }
        .search-clear:hover { color: #f8fafc; background: rgba(255, 255, 255, 0.08); }

        /* ─── Dropdown ─── */
        .global-dropdown {
          position: absolute; top: calc(100% + 0.5rem); left: 0; right: 0; z-index: 20;
          background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14), 0 2px 8px rgba(15, 23, 42, 0.06);
          overflow: hidden; max-height: min(65vh, 520px); overflow-y: auto;
        }
        .global-dropdown-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0.7rem 1rem; border-bottom: 1px solid #f1f5f9;
          font-size: 0.68rem; font-weight: 800; letter-spacing: 0.08em;
          text-transform: uppercase; color: #94a3b8;
          position: sticky; top: 0; background: #fafbfc; z-index: 1;
        }
        .global-dropdown-head.repertoire-section { color: #6366f1; background: rgba(99, 102, 241, 0.03); }
        .global-dropdown-count { background: rgba(99, 102, 241, 0.1); color: #6366f1; padding: 2px 8px; border-radius: 999px; font-size: 0.65rem; }
        .global-dropdown-list { overflow-y: auto; }
        .global-dropdown-item {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          gap: 0.75rem; padding: 0.7rem 1rem; border: none;
          border-bottom: 1px solid #f1f5f9; background: transparent;
          text-align: left; cursor: pointer; transition: background 0.15s;
        }
        .global-dropdown-item:last-child { border-bottom: none; }
        .global-dropdown-item:hover { background: #f8fafc; }
        .global-dropdown-copy { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; flex: 1; }
        .global-dropdown-title { font-size: 0.9rem; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .global-dropdown-artist { font-size: 0.75rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .global-dropdown-cta {
          flex-shrink: 0; display: inline-flex; align-items: center; gap: 0.3rem;
          padding: 0.35rem 0.7rem; border-radius: 8px; font-size: 0.7rem; font-weight: 800;
          cursor: pointer; transition: 0.15s; border: none; white-space: nowrap;
        }
        .global-dropdown-cta.add-cta { background: rgba(99, 102, 241, 0.1); color: #4f46e5; }
        .global-dropdown-cta.add-cta:hover { background: rgba(99, 102, 241, 0.2); }
        .global-dropdown-cta.remove-cta { background: rgba(239, 68, 68, 0.08); color: #dc2626; }
        .global-dropdown-cta.remove-cta:hover { background: rgba(239, 68, 68, 0.16); }
        .global-dropdown-empty { padding: 1.5rem 1rem; color: #94a3b8; font-size: 0.85rem; text-align: center; }

        /* ─── Toolbar ─── */
        .toolbar {
          display: flex; justify-content: space-between; align-items: center;
          gap: 0.6rem; flex-wrap: wrap;
          padding: 0.65rem 0.85rem; border-radius: 12px;
          background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .toolbar-btn {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.5rem 0.85rem; border-radius: 8px; font-size: 0.75rem; font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.04);
          color: #94a3b8; cursor: pointer; transition: 0.2s; white-space: nowrap;
        }
        .toolbar-btn:hover { border-color: rgba(139, 92, 246, 0.3); color: #e2e8f0; background: rgba(139, 92, 246, 0.06); }
        .toolbar-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .toolbar-btn.danger { color: #fca5a5; border-color: rgba(239, 68, 68, 0.15); }
        .toolbar-btn.danger:hover { border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.06); color: #fca5a5; }
        .toolbar-btn.accent { color: #a5b4fc; border-color: rgba(99, 102, 241, 0.2); }
        .toolbar-btn.accent:hover { border-color: rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.08); }
        .toolbar-btn.primary { background: #8b5cf6; color: #fff; border-color: #8b5cf6; }
        .toolbar-btn.primary:hover { background: #7c3aed; border-color: #7c3aed; }

        /* ─── Tabs ─── */
        .gender-tabs-container { overflow-x: auto; margin-top: 1rem; padding-bottom: 0.5rem; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .gender-tabs-container::-webkit-scrollbar { display: none; }
        .gender-tabs { display: flex; gap: 0.5rem; min-width: max-content; }
        .tab-btn {
          background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);
          color: #64748b; padding: 0.5rem 1rem; border-radius: 10px;
          cursor: pointer; transition: 0.2s; font-weight: 700; font-size: 0.73rem; white-space: nowrap;
        }
        .tab-btn:hover { color: #e2e8f0; border-color: rgba(139, 92, 246, 0.25); }
        .tab-btn.active { background: #8b5cf6; color: #fff; border-color: #8b5cf6; }
        
        /* ─── Song Table ─── */
        .repertoire-list { padding: 0; border: 1px solid rgba(255, 255, 255, 0.06); overflow: hidden; margin-top: 1rem; background: rgba(10, 10, 22, 0.7); border-radius: 16px; }
        .list-header { display: grid; grid-template-columns: 2fr 1fr 1fr 120px; padding: 1rem 1.5rem; background: rgba(255, 255, 255, 0.02); border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 0.65rem; font-weight: 800; color: rgba(226, 232, 240, 0.35); letter-spacing: 1.5px; }
        .song-row { display: grid; grid-template-columns: 2fr 1fr 1fr 120px; padding: 0.9rem 1.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.04); align-items: center; transition: background 0.15s; }
        .song-row:hover { background: rgba(255, 255, 255, 0.02); }
        .song-row:last-child { border-bottom: none; }
        .song-name { font-size: 1rem; font-weight: 700; transition: 0.2s; color: #e2e8f0; line-height: 1.3; }
        .song-artist { color: rgba(226, 232, 240, 0.45); font-size: 0.8rem; margin-top: 0.15rem; }
        .clickable-title:hover { color: #8b5cf6; }
        
        .suggestions-divider { padding: 0.7rem 1.5rem; background: rgba(16, 185, 129, 0.04); border-bottom: 1px solid rgba(16, 185, 129, 0.08); font-size: 0.62rem; font-weight: 800; color: var(--accent-primary); letter-spacing: 1px; text-transform: uppercase; }
        .repertoire-divider { background: rgba(99, 102, 241, 0.04); border-bottom-color: rgba(99, 102, 241, 0.08); color: #818cf8; }
        
        .tonality-pill { padding: 3px 10px; border-radius: 8px; font-size: 0.68rem; font-weight: 800; transition: 0.2s; }
        .tonality-pill.success { background: rgba(16, 185, 129, 0.08); color: var(--accent-primary); }
        .tonality-pill.warning { background: rgba(245, 158, 11, 0.08); color: #f59e0b; }
        
        .genre-label { font-size: 0.75rem; color: #64748b; }
        
        .action-btn { color: rgba(226, 232, 240, 0.35); transition: 0.2s; padding: 6px; border-radius: 8px; }
        .action-btn:hover { color: #e2e8f0; background: rgba(255, 255, 255, 0.05); }
        .action-btn.delete:hover { color: #f87171; background: rgba(239, 68, 68, 0.08); }
        .bulk-import-overlay { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 9999; background: rgba(15, 23, 42, 0.55); padding: 2rem; display: flex; align-items: center; justify-content: center; overflow-y: auto; }
        .bulk-import-modal { width: min(1040px, 100%); max-height: calc(100dvh - 4rem); overflow: hidden; display: flex; flex-direction: column; padding: 1.4rem; border: 1px solid rgba(226, 232, 240, 0.8); background: rgba(255, 255, 255, 0.97); margin-top: 0; border-radius: 22px; }
        .bulk-import-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.2rem; flex-shrink: 0; }
        .bulk-import-head h2 { margin: 0 0 0.35rem; font-size: 1.45rem; color: #0f172a; }
        .bulk-import-head p { margin: 0; color: #64748b; max-width: 640px; }
        .bulk-import-close { border: 1px solid rgba(148, 163, 184, 0.35); background: #fff; color: #475569; border-radius: 12px; width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; }
        .bulk-import-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 1rem; flex: 1; overflow-y: auto; min-height: 0; }
        .bulk-import-pane { border: 1px solid rgba(226, 232, 240, 0.95); border-radius: 22px; padding: 1rem; background: rgba(248, 250, 252, 0.7); }
        .bulk-import-pane.results { background: rgba(255, 255, 255, 0.88); }
        .bulk-import-label { display: block; margin-bottom: 0.75rem; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; }
        .bulk-category-field { display: flex; flex-direction: column; gap: 0.45rem; margin-bottom: 0.85rem; }
        .bulk-category-label { font-size: 0.82rem; font-weight: 700; color: #475569; }
        .bulk-category-select { width: 100%; min-height: 44px; border-radius: 14px; border: 1px solid #dbe2ea; padding: 0.75rem 0.9rem; background: #fff; color: #0f172a; outline: none; font-size: 0.92rem; font-weight: 600; }
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
        .bulk-import-footer { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(226, 232, 240, 0.9); flex-wrap: wrap; flex-shrink: 0; }
        .bulk-import-summary { display: flex; gap: 1rem; flex-wrap: wrap; color: #475569; font-size: 0.88rem; font-weight: 700; }
        .bulk-import-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .btn-ghost { background: rgba(255, 255, 255, 0.92); color: #334155; border: 1px solid rgba(148, 163, 184, 0.35); }
        .btn-spinner { width: 14px; height: 14px; border-radius: 999px; border: 2px solid rgba(255, 255, 255, 0.35); border-top-color: #fff; display: inline-block; animation: bulk-spin 0.8s linear infinite; }

        @keyframes bulk-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ─── Tablet ─── */
        @media (max-width: 968px) {
          .list-header { display: none; }
          .title-section h1 { font-size: 2.2rem; letter-spacing: -1px; }
          .song-row {
            grid-template-columns: 1fr;
            gap: 0.6rem;
            padding: 1rem 1.1rem;
          }
          .col-tonality, .col-genre, .col-actions {
            display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
          }
          .col-actions { justify-content: flex-end; }
          .song-name { font-size: 0.95rem; }
          .bulk-import-grid { grid-template-columns: 1fr; }
          .global-dropdown { position: static; margin-top: 0.5rem; max-height: min(50vh, 420px); border-radius: 14px; }
          .global-dropdown-item { padding: 0.75rem 0.9rem; }
          .global-dropdown-cta { min-height: 36px; padding: 0.4rem 0.75rem; }
          .toolbar-label { display: none; }
          .toolbar-btn { padding: 0.5rem; min-width: 38px; min-height: 38px; justify-content: center; }
        }

        /* ─── Phone ─── */
        @media (max-width: 560px) {
          .repertoire-container { padding-top: 6.5rem; padding-bottom: 4rem; }
          .title-section { margin-bottom: 1.2rem; }
          .title-section h1 { font-size: 1.75rem; margin-bottom: 0.4rem; }
          .title-section .text-muted { font-size: 0.8rem; }
          .back-link { margin-bottom: 1rem; font-size: 0.68rem; padding: 0.35rem 0.55rem; }
          .search-box { padding: 0.6rem 0.9rem; border-radius: 12px; gap: 0.65rem; }
          .search-box input { font-size: 16px; }
          .global-dropdown { max-height: min(45vh, 340px); border-radius: 12px; }
          .global-dropdown-head { padding: 0.6rem 0.8rem; font-size: 0.64rem; }
          .global-dropdown-item { padding: 0.7rem 0.8rem; gap: 0.5rem; }
          .global-dropdown-title { font-size: 0.84rem; }
          .global-dropdown-artist { font-size: 0.7rem; }
          .global-dropdown-cta { min-height: 32px; padding: 0.3rem 0.6rem; font-size: 0.66rem; border-radius: 6px; }
          .toolbar { padding: 0.5rem 0.6rem; gap: 0.4rem; border-radius: 10px; }
          .toolbar-btn { padding: 0.45rem; min-width: 36px; min-height: 36px; }
          .tab-btn { padding: 0.45rem 0.8rem; font-size: 0.68rem; }
          .song-row { padding: 0.85rem 0.9rem; gap: 0.6rem; }
          .song-name { font-size: 0.92rem; }
          .song-artist { font-size: 0.75rem; }
          .tonality-pill, .genre-label { font-size: 0.65rem; }
          .action-btn { padding: 8px; min-width: 36px; min-height: 36px; display: inline-flex; align-items: center; justify-content: center; }
          .suggestions-divider { padding: 0.6rem 0.9rem; }
          .repertoire-list { border-radius: 12px; }
          .bulk-import-overlay { padding: 0.5rem; }
          .bulk-import-modal { padding: 0.75rem; max-height: calc(100dvh - 1rem); border-radius: 14px; }
          .bulk-import-textarea { min-height: 180px; }
          .bulk-category-select { min-height: 42px; font-size: 16px; }
          .bulk-import-head h2 { font-size: 1.1rem; }
          .bulk-import-tools,
          .bulk-import-footer,
          .bulk-import-actions { flex-direction: column; align-items: stretch; }
          .bulk-result-item { align-items: flex-start; flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
