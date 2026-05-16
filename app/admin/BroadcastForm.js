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
    <div className="admin-table-wrap" style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem' }}>
        Pošalji obaveštenje svima
      </h2>
      <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 480 }}>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          style={{
            padding: '0.6rem 0.9rem', borderRadius: 8,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#e2e8f0', fontSize: '0.85rem',
          }}
        >
          {TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input
          type="text"
          placeholder="Naslov (max 100)"
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            padding: '0.6rem 0.9rem', borderRadius: 8,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#f8fafc', fontSize: '0.85rem', outline: 'none',
          }}
        />
        <textarea
          placeholder="Poruka (max 500)"
          maxLength={500}
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{
            padding: '0.6rem 0.9rem', borderRadius: 8, resize: 'vertical',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#f8fafc', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit',
          }}
        />
        <input
          type="text"
          placeholder="Link (opciono, npr. /upgrade)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          style={{
            padding: '0.6rem 0.9rem', borderRadius: 8,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#f8fafc', fontSize: '0.85rem', outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={sending}
          style={{
            padding: '0.7rem 1.5rem', borderRadius: 999,
            background: 'linear-gradient(120deg, #4d5de8, #cda667)',
            color: '#050505', border: 'none', fontWeight: 800,
            fontSize: '0.82rem', cursor: sending ? 'not-allowed' : 'pointer',
            opacity: sending ? 0.6 : 1, alignSelf: 'flex-start',
          }}
        >
          {sending ? 'Slanje…' : 'Pošalji obaveštenje'}
        </button>
        {error && <p style={{ color: '#f87171', fontSize: '0.82rem', margin: 0 }}>{error}</p>}
        {result && <p style={{ color: '#4ade80', fontSize: '0.82rem', margin: 0 }}>{result}</p>}
      </form>
    </div>
  );
}
