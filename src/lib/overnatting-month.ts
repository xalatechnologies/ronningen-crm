/** Første dag på måneden `yyyy-mm` (ISO dato-streng). */
export function monthFirstDayYm(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return "";
  return `${m[1]}-${m[2]}-01`;
}

/** Legg til én måned på `yyyy-mm`. */
export function ymAdd(ym: string, deltaMonths: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return ym;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = new Date(Date.UTC(y, mo + deltaMonths, 1));
  const ny = d.getUTCFullYear();
  const nm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${ny}-${nm}`;
}

/** Første dag på neste måned etter `yyyy-mm`. */
export function monthEndExclusiveYm(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = new Date(Date.UTC(y, mo, 1));
  const ny = d.getUTCFullYear();
  const nm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(d.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

/** Dagen før `yyyy-mm-dd` (ISO). */
export function dayBeforeYmd(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() - 1);
  const ny = t.getUTCFullYear();
  const nm = String(t.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(t.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

/** Liste med `yyyy-mm-dd` for hver dag i måneden (inclusive første, siste). */
export function daysInMonthYm(ym: string): string[] {
  const first = monthFirstDayYm(ym);
  if (!first) return [];
  const next = monthEndExclusiveYm(ym);
  if (!next) return [];
  const out: string[] = [];
  let cur = first;
  while (cur < next) {
    out.push(cur);
    const t = new Date(`${cur}T12:00:00Z`);
    t.setUTCDate(t.getUTCDate() + 1);
    const ny = t.getUTCFullYear();
    const nm = String(t.getUTCMonth() + 1).padStart(2, "0");
    const nd = String(t.getUTCDate()).padStart(2, "0");
    cur = `${ny}-${nm}-${nd}`;
  }
  return out;
}
