'use client';
import { ArrowLeft, Check, Music, ListMusic, Loader2, Piano } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

const CHUNK = 40;
const GROUPS = [
  { id: 'repertoar', title: 'Već u repertoaru', hint: 'Dobijaju Korg broj i tonalitet sa Korga – ne dupliraju se.' },
  { id: 'sigurno', title: 'Nađeno u pesmarici', hint: 'Ulaze u repertoar sa tekstom i Korg brojem.' },
  { id: 'izaberi', title: 'Izaberi pesmu', hint: 'Više mogućih pesama – izaberi pravu (ili preskoči).' },
  { id: 'nema', title: 'Nije nađeno', hint: 'Možeš ih dodati pod imenom sa Korga (bez teksta) ili preskočiti.' },
];

export default function KorgUvozPage() {
  const [imp, setImp] = useState(undefined);       // undefined = učitava, null = nema
  const [results, setResults] = useState({});     // i -> rezultat pretrage
  const [choice, setChoice] = useState({});       // i -> { akcija, songId }
  const [lists, setLists] = useState({});         // ime -> bool
  const [phase, setPhase] = useState('idle');     // idle | trazim | spremno | upisujem | gotovo
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState('');
  const [summary, setSummary] = useState(null);
  const [open, setOpen] = useState({ izaberi: true, nema: false, sigurno: false, repertoar: false });

  useEffect(() => {
    fetch('/api/korg-import', { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 401) { window.location.href = '/login?next=/bands/korg-uvoz'; return; }
        const d = await r.json();
        setImp(d.import || null);
        if (d.import) setLists(Object.fromEntries(d.import.lists.map((l) => [l.ime, true])));
      })
      .catch(() => setErr('Nema veze sa sajtom.'));
  }, []);

  const search = useCallback(async () => {
    if (!imp) return;
    setPhase('trazim'); setErr(''); setProgress(0);
    const res = {};
    const ch = {};
    for (let off = 0; off < imp.total; off += CHUNK) {
      let d = null;
      for (let tries = 0; tries < 3 && !d; tries += 1) {
        try {
          const r = await fetch('/api/korg-import/match', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ offset: off, limit: CHUNK }),
          });
          if (r.ok) d = await r.json();
        } catch { /* ponovo */ }
      }
      if (!d) { setErr('Pretraga je prekinuta (veza sa sajtom). Pokušaj ponovo.'); setPhase('idle'); return; }
      for (const x of d.results) {
        res[x.i] = x;
        if (x.status === 'repertoar') ch[x.i] = { akcija: 'repertoar', songId: x.song.id };
        else if (x.status === 'sigurno') ch[x.i] = { akcija: 'pesmarica', songId: x.song.id };
        else if (x.status === 'nema' && imp.entries[x.i]?.uListi) ch[x.i] = { akcija: 'novo' }; // da Korg liste budu pune
        else ch[x.i] = { akcija: 'preskoci' };
      }
      setProgress(Math.min(imp.total, off + CHUNK));
      setResults({ ...res });
    }
    setChoice(ch);
    setPhase('spremno');
  }, [imp]);

  useEffect(() => { if (imp && phase === 'idle' && !Object.keys(results).length) search(); }, [imp, phase, results, search]);

  const groups = useMemo(() => {
    const g = { repertoar: [], sigurno: [], izaberi: [], nema: [] };
    if (!imp) return g;
    for (const e of imp.entries) {
      const r = results[e.i];
      if (r) g[r.status].push({ e, r });
    }
    return g;
  }, [imp, results]);

  const setAll = (status, akcija) => setChoice((c) => {
    const n = { ...c };
    for (const { e } of groups[status]) n[e.i] = { akcija };
    return n;
  });

  const apply = async () => {
    setPhase('upisujem'); setErr(''); setProgress(0);
    const items = imp.entries.map((e) => ({ i: e.i, ...(choice[e.i] || { akcija: 'preskoci' }) }))
      .filter((x) => x.akcija !== 'preskoci');
    const sum = { novih: 0, azurirano: 0, preskoceno: 0 };
    for (let off = 0; off < items.length; off += CHUNK) {
      let d = null;
      for (let tries = 0; tries < 3 && !d; tries += 1) {
        try {
          const r = await fetch('/api/korg-import/apply', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: items.slice(off, off + CHUNK) }),
          });
          if (r.ok) d = await r.json();
        } catch { /* ponovo */ }
      }
      if (!d) { setErr('Upis je prekinut – pokreni „Uvezi“ ponovo (već upisane pesme se ne dupliraju).'); setPhase('spremno'); return; }
      sum.novih += d.novih; sum.azurirano += d.azurirano; sum.preskoceno += d.preskoceno;
      setProgress(Math.min(items.length, off + CHUNK));
    }
    const wanted = Object.entries(lists).filter(([, v]) => v).map(([k]) => k);
    let liste = [];
    try {
      const r = await fetch('/api/korg-import/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lists: wanted }),
      });
      if (r.ok) liste = (await r.json()).liste || [];
    } catch { /* liste nisu upisane */ }
    setSummary({ ...sum, liste, items: items.length });
    setPhase('gotovo');
  };

  const discard = async () => {
    await fetch('/api/korg-import', { method: 'DELETE' }).catch(() => {});
    setImp(null);
  };

  const count = (a) => Object.values(choice).filter((c) => c.akcija === a).length;

  return (
    <div className="container korg-page">
      <header className="kh">
        <Link href="/bands/repertoire" className="back"><ArrowLeft size={14} /> REPERTOAR</Link>
        <h1><Piano size={26} /> Uvoz sa <span className="gradient-text">Korga</span></h1>
        <p className="text-muted">
          Pesme i set liste iz Korg Pa5X SongBook-a (poslate iz programa MIDI Konverter Pa5X). Pesme sa Korg brojem –
          gosti ih naručuju, a Korg se sam prebaci na pesmu. Tvoje set liste na sajtu se ne menjaju; liste sa Korga
          dolaze kao „Korg · ime“. Pesme iz Korg set listi (📋) idu u svoje kategorije, a ostale pesme sa Korga u
          posebnu grupu „Korg – ostale“.
        </p>
      </header>

      {err && <div className="kerr">{err}</div>}

      {imp === undefined && <div className="kbox"><Loader2 className="spin" size={18} /> Učitavanje…</div>}

      {imp === null && phase !== 'gotovo' && (
        <div className="kbox">
          <h3>Nema poslatog SongBook-a</h3>
          <ol>
            <li>Na Korgu snimi SongBook na USB (Media › Save › SongBook) i otvori ga u programu (⚙ › 📖 SongBook).</li>
            <li>U programu klikni <b>⬆ Pošalji ceo SongBook na sajt</b> – pa osveži ovu stranu.</li>
          </ol>
        </div>
      )}

      {imp && phase !== 'gotovo' && (
        <>
          <div className="kbox kstats">
            <div><b>{imp.total}</b> pesama sa Korga · <b>{imp.withNumber}</b> sa brojem · <b>{imp.lists.length}</b> set lista
              <span className="text-muted"> · poslato {new Date(imp.createdAt).toLocaleString('sr-RS')}</span></div>
            {phase === 'trazim' && (
              <div className="kprog"><Loader2 className="spin" size={16} /> Tražim pesme u pesmarici… {progress}/{imp.total}
                <div className="bar"><i style={{ width: `${(100 * progress) / imp.total}%` }} /></div></div>
            )}
          </div>

          {phase !== 'trazim' && GROUPS.map((g) => (
            <section key={g.id} className="kbox">
              <div className="ghead" onClick={() => setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))}>
                <h3>{g.title} <span className="cnt">{groups[g.id].length}</span></h3>
                <span className="text-muted">{g.hint}</span>
                <span className="tog">{open[g.id] ? '▲' : '▼'}</span>
              </div>
              {g.id === 'nema' && groups.nema.length > 0 && (
                <div className="gbtn">
                  <button type="button" className="btn btn-secondary" onClick={() => setAll('nema', 'novo')}>Dodaj sve pod imenom sa Korga</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setAll('nema', 'preskoci')}>Preskoči sve</button>
                </div>
              )}
              {open[g.id] && (
                <div className="rows">
                  {groups[g.id].map(({ e, r }) => {
                    const c = choice[e.i] || { akcija: 'preskoci' };
                    return (
                      <div key={e.i} className="row">
                        <span className="num">{e.broj || '—'}</span>
                        <span className="kname">{e.ime}{e.uListi ? <em className="inl" title="Pesma je u Korg set listi"> 📋</em> : null}</span>
                        <span className="arrow">→</span>
                        {g.id === 'repertoar' || g.id === 'sigurno' ? (
                          <label className="pick">
                            <input type="checkbox" checked={c.akcija !== 'preskoci'}
                              onChange={(ev) => setChoice((x) => ({ ...x, [e.i]: ev.target.checked
                                ? { akcija: g.id === 'repertoar' ? 'repertoar' : 'pesmarica', songId: r.song.id }
                                : { akcija: 'preskoci' } }))} />
                            <span>{r.song.title} – {r.song.artist}{r.song.hasLyrics ? ' 📝' : ''}</span>
                          </label>
                        ) : g.id === 'izaberi' ? (
                          <select value={c.akcija === 'pesmarica' ? c.songId : c.akcija}
                            onChange={(ev) => {
                              const v = ev.target.value;
                              setChoice((x) => ({ ...x, [e.i]: v === 'preskoci' || v === 'novo' ? { akcija: v } : { akcija: 'pesmarica', songId: v } }));
                            }}>
                            <option value="preskoci">— preskoči —</option>
                            {r.candidates.map((k) => <option key={k.id} value={k.id}>{k.title} – {k.artist}{k.hasLyrics ? ' 📝' : ''}</option>)}
                            <option value="novo">Dodaj pod imenom sa Korga</option>
                          </select>
                        ) : (
                          <label className="pick">
                            <input type="checkbox" checked={c.akcija === 'novo'}
                              onChange={(ev) => setChoice((x) => ({ ...x, [e.i]: { akcija: ev.target.checked ? 'novo' : 'preskoci' } }))} />
                            <span className="text-muted">dodaj pod imenom sa Korga</span>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}

          {phase !== 'trazim' && imp.lists.length > 0 && (
            <section className="kbox">
              <h3><ListMusic size={18} /> Set liste sa Korga</h3>
              <p className="text-muted">Dolaze kao „Korg · ime“ (sadrže pesme koje uvoziš). Koje liste gosti vide uživo biraš u Live panelu.</p>
              <div className="lists">
                {imp.lists.map((l) => (
                  <label key={l.ime} className="pick">
                    <input type="checkbox" checked={Boolean(lists[l.ime])} onChange={(ev) => setLists((x) => ({ ...x, [l.ime]: ev.target.checked }))} />
                    <span>{l.ime} <span className="text-muted">({l.n})</span></span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {(phase === 'spremno' || phase === 'upisujem') && (
            <div className="kbox kact">
              <div>U repertoar: <b>{count('pesmarica') + count('novo')}</b> novih · <b>{count('repertoar')}</b> dobija Korg broj ·
                set lista: <b>{Object.values(lists).filter(Boolean).length}</b></div>
              {phase === 'upisujem'
                ? <div className="kprog"><Loader2 className="spin" size={16} /> Upisujem… {progress}</div>
                : (
                  <div className="gbtn">
                    <button type="button" className="btn btn-primary" onClick={apply}><Check size={16} /> Uvezi u repertoar</button>
                    <button type="button" className="btn btn-secondary" onClick={discard}>Odbaci</button>
                  </div>
                )}
            </div>
          )}
        </>
      )}

      {phase === 'gotovo' && summary && (
        <div className="kbox">
          <h3><Check size={18} /> Uvezeno</h3>
          <p>{summary.novih} novih pesama · {summary.azurirano} postojećih dobilo Korg broj{summary.preskoceno ? ` · ${summary.preskoceno} preskočeno` : ''}.</p>
          {summary.liste.length > 0 && (
            <ul>{summary.liste.map((l) => <li key={l.ime}>{l.ime}: {l.pesama} pesama{l.pesama < l.od ? ` (od ${l.od} – ostale nisu uvezene)` : ''}</li>)}</ul>
          )}
          <p className="text-muted">Pesme koje nisu u Korg set listama su u repertoaru pod „Korg – ostale“. Sledeće: u Live panelu
            označi koje set liste gosti vide uživo.</p>
          <div className="gbtn">
            <Link href="/bands/repertoire"><button type="button" className="btn btn-primary"><Music size={16} /> Repertoar</button></Link>
          </div>
        </div>
      )}

      <style jsx>{`
        .korg-page { padding-top: 7rem; padding-bottom: 4rem; max-width: 980px; }
        .kh h1 { display: flex; align-items: center; gap: .5rem; margin: .6rem 0 .4rem; font-size: clamp(1.6rem, 4vw, 2.2rem); font-weight: 800; }
        .kh :global(.back) { font-size: .75rem; font-weight: 700; letter-spacing: .08em; color: #94a3b8; display: inline-flex; gap: .3rem; align-items: center; }
        .kbox { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 1rem 1.2rem; margin-top: 1rem; }
        .kbox h3 { display: flex; align-items: center; gap: .4rem; margin: 0 0 .3rem; }
        .kerr { margin-top: 1rem; padding: .8rem 1rem; border-radius: 12px; background: rgba(239,68,68,.12); color: #fca5a5; }
        .kstats { display: flex; flex-direction: column; gap: .6rem; }
        .kprog { display: flex; flex-direction: column; gap: .4rem; color: #cbd5e1; }
        .bar { height: 6px; background: rgba(255,255,255,.08); border-radius: 4px; overflow: hidden; }
        .bar i { display: block; height: 100%; background: #6366f1; transition: width .3s; }
        .ghead { display: flex; align-items: baseline; gap: .8rem; flex-wrap: wrap; cursor: pointer; }
        .ghead h3 { margin: 0; font-size: 1.05rem; }
        .cnt { background: rgba(99,102,241,.25); border-radius: 999px; padding: 0 .55rem; font-size: .85rem; margin-left: .3rem; }
        .tog { margin-left: auto; color: #94a3b8; }
        .gbtn { display: flex; gap: .6rem; flex-wrap: wrap; margin-top: .8rem; }
        .rows { margin-top: .8rem; display: flex; flex-direction: column; gap: .35rem; max-height: 480px; overflow: auto; }
        .row { display: grid; grid-template-columns: 3.2rem minmax(8rem, 13rem) 1.2rem 1fr; gap: .5rem; align-items: center; font-size: .9rem; }
        .num { color: #94a3b8; font-variant-numeric: tabular-nums; }
        .inl { font-style: normal; opacity: .8; }
        .kname { font-family: ui-monospace, monospace; font-size: .85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .arrow { color: #64748b; }
        .pick { display: flex; gap: .45rem; align-items: center; cursor: pointer; min-width: 0; }
        .pick span { overflow: hidden; text-overflow: ellipsis; }
        select { width: 100%; background: rgba(15,23,42,.8); color: inherit; border: 1px solid rgba(255,255,255,.15); border-radius: 8px; padding: .3rem .4rem; }
        .lists { display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: .4rem; margin-top: .6rem; }
        .kact { display: flex; flex-direction: column; gap: .4rem; position: sticky; bottom: 1rem; backdrop-filter: blur(8px); background: rgba(15,23,42,.85); }
        :global(.spin) { animation: kspin .8s linear infinite; }
        @keyframes kspin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .row { grid-template-columns: 2.6rem 1fr; }
          .arrow { display: none; }
          .row > :last-child { grid-column: 1 / -1; }
        }
      `}</style>
    </div>
  );
}
