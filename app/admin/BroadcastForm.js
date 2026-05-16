'use client';
import { useState } from 'react';
import { adminFetch } from '../../lib/adminFetch';

const TARGETS = [
  { value: 'ALL', label: 'Svi korisnici' },
  { value: 'BAND', label: 'Samo bendovi' },
  { value: 'MUSICIAN', label: 'Samo muzičari' },
  { value: 'CLIENT', label: 'Samo klijenti' },
];

export default function BroadcastForm() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [target, setTarget] = useState('ALL');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const send = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Naslov i poruka su obavezni.');
      return;
    }
    setSending(true);
    setError('');
    setResult(null);
    try {
      const res = await adminFetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          link: link.trim() || null,
          target,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Greška');
      setResult(`Poslato ${data.sent} korisnik(a).`);
      setTitle('');
      setBody('');
      setLink('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="admin-section" style={{ marginTop: '2rem', maxWidth: 520 }}>
      <h2>Pošalji obaveštenje svima</h2>
      <p>Pošaljite in-app notifikaciju izabranoj grupi korisnika.</p>
      <form onSubmit={send} className="admin-form-grid">
        <div>
          <label>Ciljna grupa</label>
          <select className="admin-field" value={target} onChange={(e) => setTarget(e.target.value)}>
            {TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label>Naslov</label>
          <input className="admin-field" type="text" placeholder="Max 100 karaktera" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label>Poruka</label>
          <textarea className="admin-field" placeholder="Max 500 karaktera" maxLength={500} rows={3} value={body} onChange={(e) => setBody(e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
        </div>
        <div>
          <label>Link (opciono)</label>
          <input className="admin-field" type="text" placeholder="npr. /upgrade" value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
        <div className="admin-section-footer">
          <button type="submit" className="admin-btn" disabled={sending}>
            {sending ? 'Slanje…' : 'Pošalji obaveštenje'}
          </button>
          {error && <span className="admin-msg-err">{error}</span>}
          {result && <span className="admin-msg-ok">{result}</span>}
        </div>
      </form>
    </div>
  );
}
