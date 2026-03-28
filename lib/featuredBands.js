/** Istaknute kartice na početnoj: mešavina pravih i demo bendova (do `max`). */
export function pickFeaturedBands(list, max = 6) {
  if (!Array.isArray(list) || list.length === 0) return [];
  const isDemo = (b) =>
    Boolean(b?.demo || (b?.id != null && String(b.id).startsWith('demo-')));
  const reals = list.filter((b) => !isDemo(b));
  const demos = list.filter((b) => isDemo(b));
  const wantReal = 3;
  const wantDemo = 3;
  const r = Math.min(wantReal, reals.length);
  const d = Math.min(wantDemo, demos.length, max - r);
  const out = [...reals.slice(0, r), ...demos.slice(0, d)];
  const used = new Set(out.map((x) => x.id));
  if (out.length < max) {
    for (const b of [...reals.slice(r), ...demos.slice(d)]) {
      if (out.length >= max) break;
      if (used.has(b.id)) continue;
      used.add(b.id);
      out.push(b);
    }
  }
  return out.slice(0, max);
}
