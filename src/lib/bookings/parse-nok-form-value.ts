/** Parse NOK from react-hook-form / number input (whole kroner). */
export function parseNokFormValue(raw: unknown): number {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : 0;
  }
  const n = Number.parseFloat(String(raw ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}
