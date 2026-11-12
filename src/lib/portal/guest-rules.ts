import { z } from "zod";

export const MAX_GUESTS = 300;
export const MAX_PARTY = 10;

/** Fixed set of diet tags: totals for the venue stay meaningful and free text never leaks. */
export const DIET_TAGS = [
  "gluten",
  "nuts",
  "milk",
  "egg",
  "shellfish",
  "fish",
  "soy",
  "vegetarian",
  "vegan",
  "halal",
  "other",
] as const;
export type DietTag = (typeof DIET_TAGS)[number];

export type GuestStatus = "not_sent" | "invited" | "accepted" | "declined" | "maybe";

export type GuestRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  groupLabel: string | null;
  maxParty: number;
  status: GuestStatus;
  partySize: number;
  diet: { label: string; tags: DietTag[]; note: string }[];
  respondedAt: string | null;
  optedOut: boolean;
};

/** What the venue gets from portal_guest_summary(): numbers only. */
export type GuestSummary = {
  total: number;
  notSent: number;
  invited: number;
  noAnswer: number;
  acceptedGuests: number;
  acceptedPeople: number;
  declined: number;
  maybe: number;
  diet: Partial<Record<DietTag, number>>;
  comments: number;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim().toLowerCase();
  return value === "" ? null : value;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

export const guestInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  email: z
    .string()
    .trim()
    .max(254)
    .transform((value) => value.toLowerCase())
    .refine((value) => value === "" || EMAIL.test(value))
    .transform((value) => (value === "" ? null : value))
    .optional()
    .default(null),
  phone: optionalText(30).optional().default(null),
  groupLabel: optionalText(40).optional().default(null),
  maxParty: z.number().int().min(1).max(MAX_PARTY).default(1),
});
export type GuestInput = z.input<typeof guestInputSchema>;

export type ParsedGuestLine = { name: string; email: string | null; groupLabel: string | null };
export type PasteError = { line: number; text: string; reason: "no_name" | "bad_email" | "duplicate" | "too_many" };

/**
 * Parses pasted lines ("Navn, e-post", "Navn <e-post>", tab/semicolon separated from Excel, or just a
 * name). Third column, if any, is a group. Duplicate e-mails (also vs existing guests) are reported, not
 * silently dropped, so the customer sees what was skipped.
 */
export function parseGuestPaste(
  text: string,
  existingEmails: ReadonlySet<string> = new Set(),
  room: number = MAX_GUESTS,
): { rows: ParsedGuestLine[]; errors: PasteError[] } {
  const rows: ParsedGuestLine[] = [];
  const errors: PasteError[] = [];
  const seen = new Set(existingEmails);

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (line === "") return;
    const lineNo = index + 1;

    let name: string;
    let email: string | null = null;
    let group: string | null = null;

    const angle = line.match(/^(.*?)<\s*([^>]+?)\s*>\s*$/);
    if (angle) {
      name = angle[1].trim().replace(/^"|"$/g, "");
      email = angle[2].trim().toLowerCase();
    } else {
      const parts = line.split(/\t|;|,/).map((p) => p.trim());
      name = parts[0] ?? "";
      const second = parts[1] ?? "";
      if (second.includes("@")) {
        email = second.toLowerCase();
        group = parts[2] ? parts[2].slice(0, 40) : null;
      } else if (second !== "") {
        group = second.slice(0, 40);
      }
    }

    if (name === "") return void errors.push({ line: lineNo, text: line, reason: "no_name" });
    if (email !== null && !EMAIL.test(email)) return void errors.push({ line: lineNo, text: line, reason: "bad_email" });
    if (email !== null && seen.has(email)) return void errors.push({ line: lineNo, text: line, reason: "duplicate" });
    if (rows.length >= room) return void errors.push({ line: lineNo, text: line, reason: "too_many" });

    if (email !== null) seen.add(email);
    rows.push({ name: name.slice(0, 80), email, groupLabel: group });
  });

  return { rows, errors };
}

/** Customer-side totals from the rows they can read (same shape as the venue's summary). */
export function summarizeGuests(rows: readonly GuestRow[]): GuestSummary {
  const summary: GuestSummary = {
    total: rows.length,
    notSent: 0,
    invited: 0,
    noAnswer: 0,
    acceptedGuests: 0,
    acceptedPeople: 0,
    declined: 0,
    maybe: 0,
    diet: {},
    comments: 0,
  };
  for (const g of rows) {
    if (g.status === "not_sent") summary.notSent += 1;
    else summary.invited += 1;
    if (g.status === "invited") summary.noAnswer += 1;
    if (g.status === "declined") summary.declined += 1;
    if (g.status === "maybe") summary.maybe += 1;
    if (g.status === "accepted") {
      summary.acceptedGuests += 1;
      summary.acceptedPeople += g.partySize;
      for (const person of g.diet) {
        for (const tag of person.tags) summary.diet[tag] = (summary.diet[tag] ?? 0) + 1;
        if (person.note.trim() !== "") summary.comments += 1;
      }
    }
  }
  return summary;
}

/** Maps the database function's JSON to the typed summary (unknown tags are ignored). */
export function parseSummary(raw: unknown): GuestSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const n = (key: string) => (typeof r[key] === "number" ? (r[key] as number) : 0);
  const diet: Partial<Record<DietTag, number>> = {};
  const rawDiet = r.diet && typeof r.diet === "object" ? (r.diet as Record<string, unknown>) : {};
  for (const tag of DIET_TAGS) {
    if (typeof rawDiet[tag] === "number") diet[tag] = rawDiet[tag] as number;
  }
  return {
    total: n("total"),
    notSent: n("not_sent"),
    invited: n("invited"),
    noAnswer: n("no_answer"),
    acceptedGuests: n("accepted_guests"),
    acceptedPeople: n("accepted_people"),
    declined: n("declined"),
    maybe: n("maybe"),
    diet,
    comments: n("comments"),
  };
}
