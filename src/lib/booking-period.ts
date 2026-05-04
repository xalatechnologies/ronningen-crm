/** Shorthand yyyy-mm-dd strings; times are HH:MM 24h. */

export function eachBookingYmdInRange(
  startYmd: string,
  endYmd: string | null,
): string[] {
  const end =
    endYmd && endYmd.length >= 10 && endYmd >= startYmd ? endYmd : startYmd;
  const out: string[] = [];
  const cur = new Date(`${startYmd.slice(0, 10)}T12:00:00`);
  const last = new Date(`${end.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(last.getTime())) {
    return [startYmd.slice(0, 10)];
  }
  const walk = new Date(cur);
  while (walk <= last) {
    const y = walk.getFullYear();
    const m = String(walk.getMonth() + 1).padStart(2, "0");
    const d = String(walk.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    walk.setDate(walk.getDate() + 1);
  }
  return out;
}

/** Kompakt visning i lister (bevarer kort måned når det bare er én dag uten klokkeslett). */
export function formatBookingListDateLabel(p: {
  eventDateIso: string;
  eventEndDateIso: string | null;
  eventStartTime: string | null;
  eventEndTime: string | null;
}): string {
  const start = p.eventDateIso.slice(0, 10);
  const endRaw = p.eventEndDateIso?.slice(0, 10) ?? null;
  const endDistinct = endRaw && endRaw !== start ? endRaw : null;
  const ts = p.eventStartTime?.trim() || null;
  const te = p.eventEndTime?.trim() || null;

  if (!endDistinct && !ts && !te) {
    return new Intl.DateTimeFormat("nb-NO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${start}T12:00:00`));
  }

  const numeric = new Intl.DateTimeFormat("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const fd = (iso: string) => numeric.format(new Date(`${iso}T12:00:00`));
  const endDay = endDistinct ?? start;

  if (!endDistinct && (ts || te)) {
    if (ts && te) return `${fd(start)} ${ts} – ${te}`;
    if (ts) return `${fd(start)} ${ts}`;
    return `${fd(start)} ${te}`;
  }

  const left = ts ? `${fd(start)} ${ts}` : fd(start);
  const right = te ? `${fd(endDay)} ${te}` : fd(endDay);
  return `${left} – ${right}`;
}
