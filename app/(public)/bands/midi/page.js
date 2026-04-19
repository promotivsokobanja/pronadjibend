'use client';
import { Search, Music, Download, Lock, X, ChevronLeft, ChevronRight, Play, Upload, Trash2, Headphones, Usb, Mic2, Volume2, MonitorSpeaker, FileAudio, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MidiKaraokePlayer from '../../../../components/MidiKaraokePlayer';

const CATEGORIES = ['Sve', 'Zabavna', 'Narodna', 'Kola', 'Mixevi', 'Decije'];
const ALPHABET = 'ABCČĆDĐEFGHIJKLMNOPRSTUVZŽ'.split('');

export default function MidiLibraryPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('Sve');
  const [activeLetter, setActiveLetter] = useState('');
  const [files, setFiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [counts, setCounts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [playerFile, setPlayerFile] = useState(null);
  const [playerUrl, setPlayerUrl] = useState(null);

  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadArtist, setUploadArtist] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Zabavna');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [canUpload, setCanUpload] = useState(false);
  const [canUploadMidi, setCanUploadMidi] = useState(false);
  const [canUploadAudio, setCanUploadAudio] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentBandId, setCurrentBandId] = useState(null);
  const [currentMusicianId, setCurrentMusicianId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!r.ok) { router.replace('/login'); return; }
        const { user } = await r.json();
        const plan = String(user?.plan || '').toUpperCase();
        const hasPremiumAccess = plan.startsWith('PREMIUM');
        const isAdminUser = user?.role === 'ADMIN';
        const hasProfile = !!user?.bandId || !!user?.musicianProfileId;
        const isPremiumPlan = plan === 'PREMIUM' || plan === 'PREMIUM_VENUE';
        const isPremiumVenuePlan = plan === 'PREMIUM_VENUE';

        setIsPremium(hasPremiumAccess || isAdminUser);
        setIsAdmin(isAdminUser);
        setCanUploadMidi(isAdminUser || (hasProfile && isPremiumPlan));
        setCanUploadAudio(isAdminUser || (hasProfile && isPremiumVenuePlan));
        setCanUpload(isAdminUser || (hasProfile && isPremiumPlan));
        setCurrentUserId(user?.id || null);
        setCurrentBandId(user?.bandId || null);
        setCurrentMusicianId(user?.musicianProfileId || null);
      } catch {}
    })();
  }, [router]);

  const canDeleteFile = (file) => {
    if (isAdmin) return true;
    if (!canUpload) return false;
    if (file.uploadedBy && file.uploadedBy === currentUserId) return true;
    if (file.bandId && file.bandId === currentBandId) return true;
    if (file.musicianProfileId && file.musicianProfileId === currentMusicianId) return true;
    return false;
  };

  const fetchFiles = useCallback(async (pageToFetch) => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams({
        search: searchTerm,
        category,
        letter: activeLetter,
        page: String(pageToFetch),
      });
      const resp = await fetch(`/api/midi?${qs}`, { cache: 'no-store' });
      const data = await resp.json();
      setFiles(data.files || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      if (data.counts) setCounts(data.counts);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, category, activeLetter]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchFiles(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, category, activeLetter, fetchFiles]);

  useEffect(() => { fetchFiles(page); }, [page, fetchFiles]);

  const handlePlay = async (file) => {
    try {
      const resp = await fetch(`/api/midi/preview?id=${file.id}`);
      const data = await resp.json();
      if (data.url) {
        setPlayerFile({ ...file, fileType: data.fileType });
        setPlayerUrl(data.url);
      } else {
        alert(data.error || 'Greška pri učitavanju.');
      }
    } catch { alert('Greška pri učitavanju.'); }
  };

  const handleDownload = async (file) => {
    if (!isPremium && !isAdmin) return;
    setDownloading(file.id);
    try {
      const resp = await fetch(`/api/midi/download?id=${file.id}`);
      const data = await resp.json();
      if (data.url) {
        const a = document.createElement('a');
        a.href = data.url;
        a.download = data.fileName || file.fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert(data.error || 'Greška pri preuzimanju.');
      }
    } catch { alert('Greška pri preuzimanju.'); }
    finally { setDownloading(null); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || uploading) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('title', uploadTitle);
      fd.append('artist', uploadArtist);
      fd.append('category', uploadCategory);

      const resp = await fetch('/api/midi/upload', { method: 'POST', body: fd });
      const data = await resp.json();

      if (data.success) {
        setShowUpload(false);
        setUploadFile(null);
        setUploadTitle('');
        setUploadArtist('');
        fetchFiles();
      } else {
        alert(data.error || 'Greška pri uploadu.');
      }
    } catch { alert('Greška pri uploadu.'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (file) => {
    if (!confirm(`Obrisati "${file.title}"?`)) return;
    setDeleting(file.id);
    try {
      const resp = await fetch(`/api/midi/upload?id=${file.id}`, { method: 'DELETE' });
      const data = await resp.json();
      if (data.success) fetchFiles();
      else alert(data.error || 'Greška.');
    } catch { alert('Greška pri brisanju.'); }
    finally { setDeleting(null); }
  };

  const onFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadFile(f);
    if (!uploadTitle) {
      setUploadTitle(f.name.replace(/\.(mid|kar|mp3|wav|ogg|aac|flac|m4a)$/i, ''));
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const canAccess = isPremium || isAdmin;

  return (
    <div className="midi-container container">
      <div className="blob" style={{ top: '10%', right: '0' }}></div>

      <header className="page-header">
        <button
          type="button"
          className="back-link"
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push(currentMusicianId ? '/muzicari/profil' : '/bands');
            }
          }}
        >
          <ArrowLeft size={14} /> NAZAD
        </button>
        <div className="title-row">
          <h1>MIDI / Audio Biblioteka</h1>
          <span className="total-badge">{(counts['Sve'] || 0).toLocaleString()} fajlova</span>
          {isAdmin && <span className="admin-badge">ADMIN</span>}
          {isPremium && !isAdmin && <span className="premium-badge">PREMIUM</span>}
          {!canAccess && <span className="locked-badge"><Lock size={12} /> Potreban PREMIUM</span>}
        </div>

        {(canUploadMidi || canUploadAudio) && (
          <div className="admin-bar">
            <button className="upload-toggle-btn" onClick={() => setShowUpload(!showUpload)}>
              <Upload size={16} /> {showUpload
                ? 'Zatvori upload'
                : canUploadAudio
                  ? 'Dodaj MIDI / MP3'
                  : 'Dodaj MIDI'}
            </button>
            {!isAdmin && (
              <span className="upload-hint" style={{ marginLeft: '0.6rem', fontSize: '0.8rem', color: '#64748b' }}>
                {canUploadAudio
                  ? 'Premium Venue: dozvoljen upload MIDI i audio fajlova.'
                  : 'Premium: dozvoljen samo MIDI upload (za MP3 nadogradi na Premium Venue).'}
              </span>
            )}
          </div>
        )}

        {showUpload && (canUploadMidi || canUploadAudio) && (
          <form className="upload-form" onSubmit={handleUpload}>
            <div className="uf-row">
              <label className="file-input-label">
                <input
                  type="file"
                  accept={canUploadAudio ? '.mid,.kar,.mp3,.wav,.ogg,.aac,.flac,.m4a' : '.mid,.kar'}
                  onChange={onFileSelect}
                />
                <Upload size={16} />
                {uploadFile ? uploadFile.name : (canUploadAudio ? 'Izaberi fajl (.mid, .kar, .mp3, .wav...)' : 'Izaberi MIDI fajl (.mid, .kar)')}
              </label>
            </div>
            <div className="uf-row uf-fields">
              <input type="text" placeholder="Naziv pesme" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} className="uf-input" />
              <input type="text" placeholder="Izvođač" value={uploadArtist} onChange={e => setUploadArtist(e.target.value)} className="uf-input" />
              <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} className="uf-select">
                <option value="Zabavna">Zabavna</option>
                <option value="Narodna">Narodna</option>
                <option value="Kola">Kola</option>
                <option value="Mixevi">Mixevi</option>
                <option value="Decije">Dečije</option>
              </select>
              <button type="submit" className="uf-submit" disabled={!uploadFile || uploading}>
                {uploading ? 'Upload...' : 'Dodaj'}
              </button>
            </div>
          </form>
        )}

        {!canAccess && (
          <div className="premium-banner">
            <Lock size={18} />
            <div>
              <strong>Biblioteka je dostupna samo PREMIUM članovima.</strong>
              <p>Nadogradite na PREMIUM plan da biste koristili MIDI i audio fajlove.</p>
            </div>
            <Link href="/premium/checkout" className="upgrade-btn">Nadogradi</Link>
          </div>
        )}

        {/* ===== PLAYER FEATURE SHOWCASE ===== */}
        <div className="player-showcase">
          <div className="ps-hero">
            <div className="ps-hero-icon"><Sparkles size={20} /></div>
            <div className="ps-hero-text">
              <h2>MIDI / Audio Player</h2>
              <p>Profesionalni karaoke player sa GM SoundFont zvukovima i podrškom za eksterni MIDI</p>
            </div>
            <button className="ps-hero-btn" onClick={() => {
              if (files.length > 0) handlePlay(files[0]);
              else alert('Izaberite kategoriju da biste učitali fajlove, zatim kliknite ▶ na bilo koji fajl.');
            }}>
              <Play size={18} /> Pokreni Player
            </button>
          </div>

          <div className="ps-cards">
            <div className="ps-card">
              <div className="ps-card-icon gm"><MonitorSpeaker size={16} /></div>
              <h3>GM SoundFont</h3>
              <p>128 GM instrumenata — klavir, gitara, bas, gudači, duvači i drugi.</p>
            </div>
            <div className="ps-card">
              <div className="ps-card-icon karaoke"><Mic2 size={16} /></div>
              <h3>Karaoke</h3>
              <p>Tekst iz MIDI/KAR fajlova sa reč-po-reč highlightingom.</p>
            </div>
            <div className="ps-card">
              <div className="ps-card-icon midi-out"><Usb size={16} /></div>
              <h3>MIDI OUT</h3>
              <p>Slanje nota na eksternu USB MIDI klavijaturu u realnom vremenu.</p>
            </div>
            <div className="ps-card">
              <div className="ps-card-icon mp3"><FileAudio size={16} /></div>
              <h3>MP3 / Audio</h3>
              <p>Podrška za MP3, WAV, OGG i druge audio formate.</p>
            </div>
            <div className="ps-card">
              <div className="ps-card-icon controls"><Volume2 size={16} /></div>
              <h3>Kontrole</h3>
              <p>Play, pauza, seek, volume i lista pesama u playeru.</p>
            </div>
            <div className="ps-card">
              <div className="ps-card-icon drums"><Music size={16} /></div>
              <h3>Bubnjevi</h3>
              <p>Sintetizovani GM perkusioni kroz Web Audio API.</p>
            </div>
          </div>
        </div>

        <div className="cat-tabs">
          {CATEGORIES.map(cat => (
            <button key={cat} className={`cat-tab ${category === cat ? 'active' : ''}`}
              onClick={() => { setCategory(cat); setActiveLetter(''); setPage(1); }}>
              {cat}
              {counts[cat] != null && <span className="cat-count">{counts[cat].toLocaleString()}</span>}
            </button>
          ))}
        </div>

        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Pretraži po nazivu ili izvođaču..."
            value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setActiveLetter(''); }} />
          {searchTerm && <button className="clear-btn" onClick={() => setSearchTerm('')}><X size={16} /></button>}
        </div>

        <div className="alpha-bar">
          {ALPHABET.map(l => (
            <button key={l} className={`alpha-btn ${activeLetter === l ? 'active' : ''}`}
              onClick={() => { setActiveLetter(activeLetter === l ? '' : l); setSearchTerm(''); setPage(1); }}>
              {l}
            </button>
          ))}
        </div>
      </header>

      <main className="file-list">
        {isLoading ? (
          <div className="empty-state"><div className="loader"></div><p>Učitavanje...</p></div>
        ) : files.length === 0 ? (
          <div className="empty-state">
            <Music size={48} className="text-muted" />
            <p>{searchTerm || activeLetter ? 'Nema rezultata.' : 'Izaberite kategoriju ili pretražite.'}</p>
          </div>
        ) : (
          <>
            <div className="results-info">
              {total.toLocaleString()} rezultata
              {activeLetter && <> na slovo <strong>{activeLetter}</strong></>}
              {searchTerm && <> za <strong>&ldquo;{searchTerm}&rdquo;</strong></>}
            </div>

            <div className="list-header">
              <span className="col-play"></span>
              <span className="col-name">NAZIV</span>
              <span className="col-artist">IZVOĐAČ</span>
              <span className="col-cat">TIP</span>
              <span className="col-size">VELIČINA</span>
              <span className="col-dl">AKCIJE</span>
            </div>

            {files.map((file) => {
              const isAudio = file.fileType === 'audio' || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(file.fileName);
              return (
                <div key={file.id} className="file-row">
                  <div className="col-play">
                    <button className="play-btn" onClick={() => handlePlay(file)} title="Pusti">
                      <Play size={14} />
                    </button>
                  </div>
                  <div className="col-name">
                    <span className="midi-icon">{isAudio ? <Headphones size={14} /> : '♪'}</span>
                    <span className="file-title">{file.title}</span>
                  </div>
                  <div className="col-artist">{file.artist}</div>
                  <div className="col-cat">
                    <span className={`cat-badge ${file.category.toLowerCase()}`}>{file.category}</span>
                    {isAudio && <span className="type-tag mp3">MP3</span>}
                    {!isAudio && <span className="type-tag mid">MIDI</span>}
                  </div>
                  <div className="col-size">{formatSize(file.fileSize)}</div>
                  <div className="col-dl">
                    <div className="action-btns">
                      {canAccess ? (
                        <button className="dl-btn" onClick={() => handleDownload(file)} disabled={downloading === file.id}>
                          <Download size={14} />
                          {downloading === file.id ? '...' : isAudio ? '.mp3' : '.mid'}
                        </button>
                      ) : (
                        <span className="lock-icon"><Lock size={14} /></span>
                      )}
                      {canDeleteFile(file) && (
                        <button className="del-btn" onClick={() => handleDelete(file)} disabled={deleting === file.id} title="Obriši">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {pages > 1 && (
              <div className="pagination">
                <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={16} /> Preth.
                </button>
                <span className="page-info">{page} / {pages}</span>
                <button className="page-btn" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
                  Sled. <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {playerUrl && playerFile && (
        <MidiKaraokePlayer
          fileUrl={playerUrl}
          fileName={`${playerFile.title} - ${playerFile.artist}`}
          initialSongId={playerFile.id}
          songList={files}
          onClose={() => { setPlayerUrl(null); setPlayerFile(null); }}
        />
      )}

      <style jsx>{`
        .midi-container { padding-top: 8rem; padding-bottom: 6rem; min-height: 100vh; overflow-x: clip; overflow-y: visible; box-sizing: border-box; width: 100%; position: relative; touch-action: pan-y pinch-zoom; }
        .page-header { margin-bottom: 2rem; position: relative; z-index: 2; }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #334155;
          font-weight: 800;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 1.5rem;
          padding: 0.45rem 0.7rem;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(255, 255, 255, 0.88);
          position: relative;
          z-index: 3;
          transition: 0.2s ease;
        }
        .back-link:hover { color: #0f172a; border-color: rgba(100, 116, 139, 0.75); }

        .title-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .title-row h1 { font-size: 2.8rem; font-weight: 800; letter-spacing: -2px; }
        .total-badge { background: rgba(59,130,246,0.1); color: #60a5fa; padding: 4px 14px; border-radius: 100px; font-size: 0.8rem; font-weight: 800; }
        .premium-badge { background: linear-gradient(135deg, #f59e0b, #f97316); color: black; padding: 4px 14px; border-radius: 100px; font-size: 0.75rem; font-weight: 900; letter-spacing: 1px; }
        .admin-badge { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 4px 14px; border-radius: 100px; font-size: 0.75rem; font-weight: 900; letter-spacing: 1px; }
        .locked-badge { display: flex; align-items: center; gap: 4px; background: rgba(239,68,68,0.1); color: #f87171; padding: 4px 14px; border-radius: 100px; font-size: 0.75rem; font-weight: 800; }

        .admin-bar { margin-bottom: 1.5rem; }
        .upload-toggle-btn {
          display: flex; align-items: center; gap: 8px; padding: 10px 24px; border-radius: 100px;
          background: linear-gradient(135deg, #ef4444, #dc2626); border: none;
          color: white; font-size: 0.85rem; font-weight: 800; cursor: pointer; transition: 0.3s;
        }
        .upload-toggle-btn:hover { transform: scale(1.03); }

        .upload-form {
          background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.2);
          border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;
        }
        .uf-row { margin-bottom: 0.75rem; }
        .uf-fields { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
        .file-input-label {
          display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 100px;
          border: 2px dashed rgba(239,68,68,0.3); color: #f87171; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; transition: 0.2s; background: rgba(239,68,68,0.03);
        }
        .file-input-label:hover { border-color: #ef4444; background: rgba(239,68,68,0.08); }
        .file-input-label input { display: none; }
        .uf-input {
          padding: 8px 14px; border-radius: 100px; border: 1px solid var(--border);
          background: rgba(255,255,255,0.03); color: #e2e8f0; font-size: 0.85rem; flex: 1; min-width: 150px;
        }
        .uf-select {
          padding: 8px 14px; border-radius: 100px; border: 1px solid var(--border);
          background: rgba(255,255,255,0.03); color: #e2e8f0; font-size: 0.85rem;
        }
        .uf-submit {
          padding: 8px 24px; border-radius: 100px; border: none;
          background: linear-gradient(135deg, #ef4444, #dc2626); color: white;
          font-size: 0.85rem; font-weight: 800; cursor: pointer; transition: 0.3s;
        }
        .uf-submit:hover:not(:disabled) { transform: scale(1.05); }
        .uf-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .premium-banner {
          display: flex; align-items: center; gap: 1.25rem; padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, rgba(245,158,11,0.08), rgba(249,115,22,0.08));
          border: 1px solid rgba(245,158,11,0.25); border-radius: var(--radius-md);
          margin-bottom: 1.5rem; color: #fbbf24;
        }
        .premium-banner p { font-size: 0.8rem; color: #a78bfa; margin-top: 2px; }
        .upgrade-btn {
          padding: 8px 20px; border-radius: 100px; font-size: 0.8rem; font-weight: 800;
          background: linear-gradient(135deg, #f59e0b, #f97316); color: black; text-decoration: none;
          white-space: nowrap; transition: 0.3s;
        }
        .upgrade-btn:hover { transform: scale(1.05); }

        /* ===== PLAYER SHOWCASE ===== */
        .player-showcase { margin-bottom: 1.5rem; }

        .ps-hero {
          display: flex; align-items: center; gap: 1rem; padding: 0.85rem 1.25rem;
          background: linear-gradient(135deg, rgba(96,165,250,0.08) 0%, rgba(139,92,246,0.08) 50%, rgba(236,72,153,0.06) 100%);
          border: 1px solid rgba(96,165,250,0.15); border-radius: 12px;
          margin-bottom: 0.75rem; flex-wrap: wrap;
        }
        .ps-hero-icon {
          width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; flex-shrink: 0;
          box-shadow: 0 3px 12px rgba(59,130,246,0.25);
        }
        .ps-hero-text { flex: 1; min-width: 160px; }
        .ps-hero-text h2 { font-size: 1.05rem; font-weight: 800; letter-spacing: -0.3px; color: #e2e8f0; margin: 0 0 2px; }
        .ps-hero-text p { font-size: 0.72rem; color: #94a3b8; margin: 0; line-height: 1.3; }
        .ps-hero-btn {
          display: flex; align-items: center; gap: 10px; padding: 12px 28px; border-radius: 100px;
          background: linear-gradient(135deg, #3b82f6, #6366f1); border: none;
          color: white; font-size: 0.95rem; font-weight: 800; cursor: pointer;
          transition: all 0.3s; white-space: nowrap;
          box-shadow: 0 4px 24px rgba(59,130,246,0.3);
        }
        .ps-hero-btn:hover { transform: scale(1.05); box-shadow: 0 6px 32px rgba(59,130,246,0.4); }

        .ps-cards {
          display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem;
        }
        .ps-card {
          padding: 0.65rem 0.7rem 0.75rem; border-radius: 10px;
          background: rgba(255,255,255,0.02); border: 1px solid var(--border);
          transition: all 0.3s;
        }
        .ps-card:hover { border-color: rgba(96,165,250,0.25); background: rgba(96,165,250,0.03); transform: translateY(-1px); }
        .ps-card-icon {
          width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
          margin-bottom: 0.4rem;
        }
        .ps-card-icon.gm { background: rgba(96,165,250,0.12); color: #60a5fa; }
        .ps-card-icon.karaoke { background: rgba(251,191,36,0.12); color: #fbbf24; }
        .ps-card-icon.midi-out { background: rgba(16,185,129,0.12); color: #34d399; }
        .ps-card-icon.mp3 { background: rgba(168,85,247,0.12); color: #c084fc; }
        .ps-card-icon.controls { background: rgba(236,72,153,0.12); color: #f472b6; }
        .ps-card-icon.drums { background: rgba(245,158,11,0.12); color: #f59e0b; }
        .ps-card h3 { font-size: 0.7rem; font-weight: 800; color: #e2e8f0; margin: 0 0 0.2rem; }
        .ps-card p { font-size: 0.62rem; color: #64748b; line-height: 1.4; margin: 0; }

        @media (max-width: 1024px) {
          .ps-cards { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 640px) {
          .ps-cards { grid-template-columns: repeat(2, 1fr); }
          .ps-hero { flex-direction: column; text-align: center; padding: 0.85rem; }
          .ps-hero-btn { width: 100%; justify-content: center; }
        }

        .cat-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .cat-tab {
          padding: 8px 18px; border-radius: 100px; font-size: 0.8rem; font-weight: 700;
          border: 1px solid var(--border); background: rgba(255,255,255,0.02);
          color: #888; cursor: pointer; transition: all 0.25s; display: flex; align-items: center; gap: 8px;
        }
        .cat-tab:hover { border-color: #555; color: #ccc; }
        .cat-tab.active { background: #60a5fa; color: black; border-color: #60a5fa; }
        .cat-tab.active .cat-count { background: rgba(0,0,0,0.2); color: black; }
        .cat-count { font-size: 0.65rem; background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 100px; color: #666; }

        .search-box {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.7rem 1.25rem; background: rgba(255,255,255,0.03);
          border: 1px solid var(--border); border-radius: 100px;
          margin-bottom: 1rem; transition: border-color 0.3s;
        }
        .search-box:focus-within { border-color: #60a5fa; }
        .search-icon { color: #555; flex-shrink: 0; }
        .search-box input { background: none; border: none; color: #1a1a1a; width: 100%; outline: none; font-size: 0.95rem; }
        .clear-btn { background: none; border: none; color: #555; cursor: pointer; display: flex; padding: 4px; border-radius: 50%; }
        .clear-btn:hover { color: #ef4444; }

        .alpha-bar { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 0.5rem; }
        .alpha-btn {
          width: 34px; height: 34px; border-radius: 8px; font-size: 0.75rem; font-weight: 800;
          border: 1px solid var(--border); background: rgba(255,255,255,0.02);
          color: #666; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
        }
        .alpha-btn:hover { border-color: #555; color: #ccc; }
        .alpha-btn.active { background: #60a5fa; color: black; border-color: #60a5fa; }

        .results-info { font-size: 0.8rem; color: #666; margin-bottom: 0.75rem; padding-left: 4px; }
        .results-info strong { color: #aaa; }

        .list-header {
          display: grid; grid-template-columns: 40px 2fr 1.2fr 1fr 0.6fr 1fr;
          padding: 0.75rem 1.25rem; font-size: 0.65rem; font-weight: 800; color: #555;
          letter-spacing: 1.5px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.02);
        }

        .file-row {
          display: grid; grid-template-columns: 40px 2fr 1.2fr 1fr 0.6fr 1fr;
          padding: 0.75rem 1.25rem; align-items: center;
          border-bottom: 1px solid var(--border); transition: background 0.15s;
        }
        .file-row:hover { background: rgba(255,255,255,0.02); }

        .play-btn {
          display: flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 50%;
          background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25);
          color: #34d399; cursor: pointer; transition: all 0.2s;
        }
        .play-btn:hover { background: #34d399; color: black; border-color: #34d399; transform: scale(1.1); }
        .lock-icon-sm { color: #333; display: flex; align-items: center; justify-content: center; }

        .col-name { display: flex; align-items: center; }
        .midi-icon { color: #60a5fa; margin-right: 8px; font-size: 1rem; display: flex; align-items: center; }
        .file-title { font-weight: 600; font-size: 0.95rem; }
        .col-artist { color: #888; font-size: 0.85rem; }
        .col-cat { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .col-size { color: #666; font-size: 0.8rem; }

        .cat-badge { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; padding: 3px 10px; border-radius: 100px; }
        .cat-badge.zabavna { background: rgba(59,130,246,0.1); color: #60a5fa; }
        .cat-badge.narodna { background: rgba(234,179,8,0.1); color: #facc15; }
        .cat-badge.kola { background: rgba(16,185,129,0.1); color: #34d399; }
        .cat-badge.mixevi { background: rgba(168,85,247,0.1); color: #c084fc; }
        .cat-badge.decije { background: rgba(236,72,153,0.1); color: #f472b6; }

        .type-tag { font-size: 0.55rem; font-weight: 900; letter-spacing: 0.5px; padding: 2px 8px; border-radius: 100px; }
        .type-tag.mid { background: rgba(96,165,250,0.08); color: #60a5fa; }
        .type-tag.mp3 { background: rgba(52,211,153,0.08); color: #34d399; }

        .action-btns { display: flex; align-items: center; gap: 6px; }
        .dl-btn {
          display: flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 100px;
          background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.25);
          color: #60a5fa; font-size: 0.72rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
        }
        .dl-btn:hover:not(:disabled) { background: #60a5fa; color: black; border-color: #60a5fa; }
        .dl-btn:disabled { opacity: 0.5; cursor: wait; }

        .del-btn {
          display: flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 50%;
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
          color: #f87171; cursor: pointer; transition: all 0.2s;
        }
        .del-btn:hover:not(:disabled) { background: #ef4444; color: white; border-color: #ef4444; }
        .del-btn:disabled { opacity: 0.4; cursor: wait; }

        .lock-icon { color: #444; display: flex; align-items: center; }

        .pagination { display: flex; justify-content: center; align-items: center; gap: 1.5rem; margin-top: 2rem; padding: 1rem 0; }
        .page-btn {
          display: flex; align-items: center; gap: 4px; padding: 8px 20px; border-radius: 100px;
          background: rgba(255,255,255,0.03); border: 1px solid var(--border);
          color: #aaa; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: 0.3s;
        }
        .page-btn:hover:not(:disabled) { border-color: #60a5fa; color: #60a5fa; }
        .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .page-info { font-size: 0.8rem; color: #555; font-weight: 700; }

        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 5rem 2rem; color: #444; }

        @media (max-width: 1024px) {
          .midi-container { padding-top: 7.5rem; }
          .title-row h1 { font-size: 2.2rem; }
          .list-header { grid-template-columns: 40px 2fr 1.2fr 0.8fr 1fr; }
          .file-row { grid-template-columns: 40px 2fr 1.2fr 0.8fr 1fr; }
          .col-size { display: none; }
          .ps-hero { gap: 0.75rem; }
          .alpha-bar {
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            padding-bottom: 0.3rem;
          }
          .alpha-bar::-webkit-scrollbar { height: 5px; }
        }

        @media (max-width: 768px) {
          .midi-container { padding-top: 7rem; padding-bottom: 4.5rem; }
          .title-row h1 { font-size: 2rem; }
          .alpha-btn { width: 28px; height: 28px; font-size: 0.65rem; }
          .list-header { display: none; }
          .file-row {
            grid-template-columns: 36px 1fr;
            gap: 0.5rem 0.75rem;
            padding: 0.85rem 1rem;
          }
          .col-artist { display: block; font-size: 0.78rem; color: #888; grid-column: 2; margin-top: -0.3rem; }
          .col-cat { grid-column: 2; }
          .col-size { display: none; }
          .col-dl { grid-column: 1 / -1; display: flex; justify-content: flex-end; }
          .col-play { display: flex; align-items: flex-start; padding-top: 2px; }
          .premium-banner { flex-direction: column; text-align: center; }
          .uf-fields { flex-direction: column; }
          .uf-input, .uf-select { width: 100%; }
          .search-box { border-radius: 16px; padding: 0.7rem 1rem; }
          .cat-tabs { gap: 0.4rem; }
          .cat-tab { padding: 0.55rem 0.85rem; font-size: 0.75rem; }
          .pagination { flex-direction: column; gap: 0.75rem; }
          .page-btn { width: 100%; justify-content: center; }
        }

        @media (max-width: 560px) {
          .midi-container { padding-top: 6.5rem; }
          .title-row h1 { font-size: 1.7rem; letter-spacing: -1px; }
          .title-row { margin-bottom: 1rem; }
          .ps-hero { flex-direction: column; text-align: center; padding: 0.75rem; }
          .ps-hero-btn { width: 100%; justify-content: center; font-size: 0.85rem; padding: 10px 20px; }
          .file-row { padding: 0.8rem 0.85rem; }
          .file-title { font-size: 0.88rem; }
          .action-btns { gap: 0.5rem; }
          .dl-btn { padding: 6px 14px; font-size: 0.7rem; }
          .upload-form { padding: 1rem; }
        }
      `}</style>
    </div>
  );
}
