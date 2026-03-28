/**
 * Kalendar-datum bez pomeranja dana (TZ): "YYYY-MM-DD" ↔ Date u UTC ponoći tog kalendarskog dana.
 * Koristi se za BusyDate / prikaz zauzetosti da klik na 30 uvek bude 30, ne 29.
 */

export function parseCalendarDateParam(dateInput) {
  const m = String(dateInput ?? '')
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mo, d, 0, 0, 0, 0));
}

/** Jedinstveni ključ za poređenje sa ćelijama kalendara */
export function dateToCalendarKeyUTC(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
}

/** Ključ za dan u mreži (isti format kao API) — samo brojevi, bez Date() za dan */
export function cellCalendarKey(year, monthIndex, dayOfMonth) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
}
