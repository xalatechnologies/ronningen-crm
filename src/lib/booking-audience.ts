export type BookingAudience = "Bedrift" | "Privat";

/** Samme prinsipp som i bookinskjeema: ukjente verdier blir «Privat». */
export function normalizeBookingAudience(raw: string): BookingAudience {
  const t = raw.trim();
  if (t === "Bedrift" || t.toLowerCase() === "bedrift") return "Bedrift";
  if (t === "Privat" || t.toLowerCase() === "privat") return "Privat";
  const l = t.toLowerCase();
  if (l.includes("bedrift") || l.includes("corporate") || l.includes("business")) {
    return "Bedrift";
  }
  return "Privat";
}
