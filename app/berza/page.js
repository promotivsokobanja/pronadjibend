const demoProfiles = [
  { id: 'm1', name: 'Marko J.', instrument: 'Gitara', city: 'Beograd' },
  { id: 'm2', name: 'Ivana P.', instrument: 'Vokal', city: 'Novi Sad' },
  { id: 'm3', name: 'Nikola R.', instrument: 'Klavijature', city: 'Niš' },
];

export default function BerzaPage() {
  return (
    <section className="space-y-4">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Nova Sekcija</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">Berza muzičara</h1>
        <p className="mt-2 text-sm text-slate-600">
          Javna pretraga muzičara za zamene po instrumentu i gradu.
        </p>
      </header>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <input
          type="text"
          placeholder="Filter instrument..."
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500/30 transition focus:border-sky-500 focus:ring"
        />
        <input
          type="text"
          placeholder="Filter grad..."
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-500/30 transition focus:border-sky-500 focus:ring"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {demoProfiles.map((m) => (
          <article key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">{m.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{m.instrument}</p>
            <p className="text-sm text-slate-500">{m.city}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
