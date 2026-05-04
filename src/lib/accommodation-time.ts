/** Normaliser PostgreSQL `time` til `HH:MM` for `input[type=time]`. */
export function accommodationTimeToInputValue(
  raw: string | null | undefined,
): string {
  if (raw == null || String(raw).trim() === "") return "";
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(raw).trim());
  if (!m) return "";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/** Klokkeslett for visning i tabell (tom streng hvis mangler). */
export function formatAccommodationTimeLabel(
  raw: string | null | undefined,
): string {
  return accommodationTimeToInputValue(raw);
}
