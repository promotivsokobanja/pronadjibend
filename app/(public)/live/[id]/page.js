'use client';
import { Search, Music, Send, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { songs as allSongs } from '../../../../lib/songs';

export default function GuestLivePage({ params }) {
  const [activeTab, setActiveTab] = useState('Muške Zabavne');
  const [songs] = useState(allSongs);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [tableNum, setTableNum] = useState('');
  const [selectedSong, setSelectedSong] = useState(null);
  const [requestSent, setRequestSent] = useState(false);

  const confirmRequest = () => {
    if (!tableNum) return alert('Molimo unesite broj stola.');
    setRequestSent(true);
    setTimeout(() => {
      setRequestSent(false);
      setSelectedSong(null);
      setTableNum('');
    }, 3000);
  };

  const filteredSongs = songs.filter(s => 
    s.type === activeTab &&
    (s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (s.artist && s.artist.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const categories = ['Muške Zabavne', 'Ženske Zabavne', 'Muške Narodne', 'Ženske Narodne', 'Starije Zabavne'];

  return (
    <div className="guest-container container">
      <div className="blob" style={{ top: '10%', right: '10%' }}></div>
      <header className="guest-header">
        <div className="live-indicator"><span className="dot"></span> UŽIVO NASTUP</div>
        <h1>Pronađi Bend</h1>
        <p className="text-muted">Izaberite pesmu i pošaljite zahtev bendu direktno sa vašeg stola.</p>
        <div className="search-bar">
          <Search size={18} className="text-muted" />
          <input type="text" placeholder="Pretraži 600+ pesama..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="gender-tabs-container">
          <div className="gender-tabs">
            {categories.map(cat => (
              <button key={cat} className={`tab-btn ${activeTab === cat ? 'active' : ''}`} onClick={() => setActiveTab(cat)}>
                {cat} ({songs.filter(s => s.type === cat).length})
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="song-list">
        {filteredSongs.map(song => (
          <div key={song.id} className="song-row glass-card" onClick={() => setSelectedSong(song)}>
            <div className="song-info">
              <p className="song-title">{song.title}</p>
              <p className="song-artist">{song.artist || 'Evergreen / Folk'}</p>
            </div>
            <button className="btn btn-secondary btn-sm">Naruči</button>
          </div>
        ))}
        {filteredSongs.length === 0 && <div className="empty-state"><Music size={32} className="text-muted" /><p>Nema rezultata.</p></div>}
      </main>
      {selectedSong && !requestSent && (
        <div className="modal-overlay">
          <div className="modal glass-card">
            <h3>Naruči Pesmu</h3>
            <p className="selected-song">{selectedSong.title} {selectedSong.artist ? `— ${selectedSong.artist}` : ''}</p>
            <div className="form-group">
              <label>Vaš broj stola:</label>
              <input type="number" placeholder="npr. 12" value={tableNum} onChange={(e) => setTableNum(e.target.value)} autoFocus />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelectedSong(null)}>Odustani</button>
              <button className="btn btn-primary" onClick={confirmRequest}>Pošalji Bendu</button>
            </div>
          </div>
        </div>
      )}
      {requestSent && (
        <div className="modal-overlay">
          <div className="success-card glass-card">
            <CheckCircle2 size={48} color="var(--accent-primary)" />
            <h2>Zahtev Poslat</h2>
            <p>Hvala! Vaša narudžbina je stigla do benda.</p>
          </div>
        </div>
      )}
      <style jsx>{`
        .guest-container { padding-top: 4rem; padding-bottom: 4rem; min-height: 100vh; }
        .guest-header { text-align: center; margin-bottom: 4rem; }
        .live-indicator { display: inline-flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.1); color: var(--accent-primary); padding: 4px 12px; border-radius: 100px; font-size: 0.7rem; font-weight: 800; margin-bottom: 1.5rem; }
        .dot { width: 6px; height: 6px; background: var(--accent-primary); border-radius: 50%; }
        .guest-header h1 { font-size: 3rem; font-weight: 800; margin-bottom: 1rem; }
        .search-bar { max-width: 500px; margin: 2.5rem auto 1.5rem; display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1.25rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 100px; }
        .search-bar input { background: none; border: none; color: white; width: 100%; outline: none; font-size: 0.95rem; }
        
        .gender-tabs-container { overflow-x: auto; margin-top: 2rem; padding-bottom: 1rem; -webkit-overflow-scrolling: touch; }
        .gender-tabs-container::-webkit-scrollbar { height: 4px; }
        .gender-tabs-container::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        
        .gender-tabs { display: flex; justify-content: center; gap: 0.5rem; min-width: max-content; padding: 0 1rem; }
        .tab-btn { background: rgba(255,255,255,0.03); border: 1px solid var(--border); color: #888; padding: 0.6rem 1rem; border-radius: 100px; cursor: pointer; transition: 0.3s; font-weight: 700; font-size: 0.7rem; white-space: nowrap; }
        .tab-btn:hover { background: rgba(255,255,255,0.08); color: white; }
        .tab-btn.active { background: var(--accent-primary); color: black; border-color: var(--accent-primary); }
        
        .song-list { max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 0.5rem; }
        .song-row { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; cursor: pointer; border: 1px solid var(--border); transition: 0.2s; }
        .song-row:hover { background: rgba(255,255,255,0.02); transform: translateY(-2px); border-color: rgba(255,255,255,0.1); }
        .song-title { font-weight: 700; font-size: 1.05rem; margin-bottom: 0.25rem; }
        .song-artist { font-size: 0.85rem; color: var(--text-muted); }
        
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 1.5rem; }
        .modal, .success-card { width: 100%; max-width: 400px; padding: 3rem; text-align: center; }
        .selected-song { font-size: 1.1rem; font-weight: 700; margin: 1rem 0 2rem; color: var(--accent-primary); }
        .form-group label { display: block; margin-bottom: 0.75rem; font-size: 0.85rem; font-weight: 600; color: #555; text-transform: uppercase; }
        .form-group input { width: 100%; padding: 1rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 8px; color: white; font-size: 1.5rem; text-align: center; }
        .modal-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
      `}</style>
    </div>
  );
}
