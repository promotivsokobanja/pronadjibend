'use client';
import { Mail, Phone, MapPin, Calendar, Star, Send, Shield, Music, Video, Info, ArrowLeft, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewSongPage() {
  const router = useRouter();
  const [bandId, setBandId] = useState(null);
  const [musicianId, setMusicianId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [song, setSong] = useState({
    title: '',
    artist: '',
    lyrics: '',
    category: 'Muške Zabavne',
    type: 'Zabavna'
  });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!r.ok) {
          router.replace('/login');
          return;
        }
        const { user } = await r.json();
        if (user?.bandId) setBandId(user.bandId);
        else if (user?.musicianProfileId) setMusicianId(user.musicianProfileId);
      } catch {
        /* ignore */
      } finally {
        setAuthLoading(false);
      }
    })();
  }, [router]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!bandId && !musicianId) {
      alert('Nalog nije povezan sa bendom ili muzičarskim profilom.');
      return;
    }
    setIsSaving(true);
    const payload = { ...song };
    if (bandId) payload.bandId = bandId;
    else payload.musicianId = musicianId;
    try {
      const resp = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.error || 'Greška pri čuvanju.');
      }
      
      alert('Pesma uspešno dodata!');
      router.push('/bands/repertoire');
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const categories = ['Muške Zabavne', 'Ženske Zabavne', 'Muške Narodne', 'Ženske Narodne', 'Starije Zabavne'];

  if (authLoading) {
    return (
      <div className="edit-container container">
        <p className="text-muted" style={{ paddingTop: '8rem' }}>Učitavanje...</p>
      </div>
    );
  }

  if (!bandId && !musicianId) {
    return (
      <div className="edit-container container">
        <header className="edit-header" style={{ paddingTop: '8rem' }}>
          <Link href="/bands/repertoire" className="back-link"><ArrowLeft size={16} /> Nazad na Repertoar</Link>
          <p className="text-muted">Dodavanje pesme je dostupno samo nalozima sa povezanim bend ili muzičarskim profilom.</p>
        </header>
      </div>
    );
  }

  return (
    <div className="edit-container container">
      <header className="edit-header">
        <Link href="/bands/repertoire" className="back-link"><ArrowLeft size={16} /> Nazad na Repertoar</Link>
        <h1>Dodaj Novu <span className="gradient-text">Pesmu</span></h1>
      </header>

      <div className="edit-grid">
        <form onSubmit={handleSave} className="glass-card edit-card">
          <div className="input-group">
            <label>Naslov Pesme</label>
            <input 
              type="text" 
              placeholder="npr. Lutka" 
              required 
              value={song.title} 
              onChange={e => setSong({...song, title: e.target.value})} 
            />
          </div>
          
          <div className="input-group">
            <label>Izvođač</label>
            <input 
              type="text" 
              placeholder="npr. S.A.R.S." 
              required 
              value={song.artist} 
              onChange={e => setSong({...song, artist: e.target.value})} 
            />
          </div>

          <div className="form-row">
            <div className="input-group">
              <label>Kategorija</label>
              <select value={song.category} onChange={e => setSong({...song, category: e.target.value})}>
                {categories.map(cat => <option key={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Žanr</label>
              <select value={song.type} onChange={e => setSong({...song, type: e.target.value})}>
                <option>Zabavna</option>
                <option>Narodna</option>
                <option>Pop/Rock</option>
                <option>Evergreen</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>Tekst Pesme (izbegavaj akorde ovde radi čitljivosti)</label>
            <textarea 
              rows="15" 
              placeholder="Unesite tekst pesme..." 
              value={song.lyrics} 
              onChange={e => setSong({...song, lyrics: e.target.value})}
            ></textarea>
          </div>

          <button className="btn btn-primary btn-full shadow-glow" type="submit" disabled={isSaving}>
            <Save size={18} /> {isSaving ? 'Čuvanje...' : 'Sajvaj Pesmu'}
          </button>
        </form>

        <aside className="help-section glass-card">
          <h3>💡 Saveti</h3>
          <p>Dodavanjem nove pesme, ona će odmah biti vidljiva u Vašem digitalnom repertoaru i klijenti će moći da je naruče tokom Live session-a.</p>
          <ul className="help-list">
            <li>Koristite velike početne slova za naslov.</li>
            <li>Ako pesma ima specifičan aranžman, napomenite to u tekstu.</li>
            <li>Pauze u tekstu (razmaci) pomažu čitljivosti na bini.</li>
          </ul>
        </aside>
      </div>

      <style jsx>{`
        .edit-container { padding-top: 8rem; padding-bottom: 6rem; }
        .edit-header { margin-bottom: 3rem; position: relative; z-index: 2; }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #334155;
          font-weight: 800;
          margin-bottom: 1rem;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 0.45rem 0.7rem;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(255, 255, 255, 0.88);
          position: relative;
          z-index: 3;
          transition: 0.2s ease;
        }
        .back-link:hover { color: #0f172a; border-color: rgba(100, 116, 139, 0.75); }
        
        .edit-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 3rem; align-items: start; }
        .edit-card { padding: 3rem; border: 1px solid var(--border); }
        
        .input-group { margin-bottom: 2rem; }
        .input-group label { display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #555; margin-bottom: 0.75rem; }
        .input-group input, .input-group select, .input-group textarea { width: 100%; padding: 1rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 8px; color: white; font-size: 1rem; outline: none; }
        .input-group textarea { font-family: 'Inter', sans-serif; line-height: 1.6; }
        
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        
        .help-section { padding: 3rem; border: 1px solid var(--border); position: sticky; top: 100px; }
        .help-section h3 { margin-bottom: 1.5rem; font-size: 1.25rem; }
        .help-section p { color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; margin-bottom: 2rem; }
        .help-list { list-style: disc; padding-left: 1.5rem; color: var(--text-muted); font-size: 0.9rem; }
        .help-list li { margin-bottom: 1rem; }

        @media (max-width: 968px) {
          .edit-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
