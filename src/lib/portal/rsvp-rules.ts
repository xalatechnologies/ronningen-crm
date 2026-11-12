import { z } from "zod";

import { DIET_TAGS, MAX_PARTY, type DietTag, type GuestRow, type GuestStatus } from "./guest-rules";

export const MAX_DAILY_EMAILS = 300;
export const MAX_DAILY_EMAILS_ORG = 1000;
export const MAX_DAILY_EMAILS_PLATFORM = 3000;
export const REMINDER_COOLDOWN_DAYS = 3;
export const RSVP_MIN_INTERVAL_MS = 2_000;
export const MAX_RSVP_UPDATES = 50;
export const DIET_NOTE_MAX = 200;

export const RSVP_ANSWERS = ["accepted", "declined", "maybe"] as const;
export type RsvpAnswer = (typeof RSVP_ANSWERS)[number];

const person = z.object({
  tags: z.array(z.enum(DIET_TAGS)).max(DIET_TAGS.length),
  note: z.string().trim().max(DIET_NOTE_MAX),
});

export const rsvpInputSchema = z.object({
  answer: z.enum(RSVP_ANSWERS),
  partySize: z.number().int().min(1).max(MAX_PARTY),
  diet: z.array(person).max(MAX_PARTY),
  consent: z.boolean(),
});
export type RsvpInput = z.input<typeof rsvpInputSchema>;

export type RsvpFailure = "invalid" | "party_too_large" | "consent_required" | "deadline_passed" | "rate_limited" | "not_found";

/** Free-text diet notes are plain text: a link in one would be phishing, so reject it like the card text. */
const LINK = /(https?:\/\/|www\.)/i;

/**
 * Turns a guest's answer into the values to store. Declined / maybe store no diet (it is only needed for
 * people who are coming). Diet is stored per person, exactly `partySize` entries, and only with consent.
 */
export function normalizeRsvp(
  raw: unknown,
  maxParty: number,
): { ok: true; status: GuestStatus; partySize: number; diet: { label: string; tags: DietTag[]; note: string }[]; hasDiet: boolean } | { ok: false; error: RsvpFailure } {
  const parsed = rsvpInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { answer, partySize, diet, consent } = parsed.data;

  if (answer !== "accepted") {
    return { ok: true, status: answer, partySize: 1, diet: [], hasDiet: false };
  }
  if (partySize > maxParty) return { ok: false, error: "party_too_large" };
  if (diet.some((p) => LINK.test(p.note))) return { ok: false, error: "invalid" };

  const people = Array.from({ length: partySize }, (_, i) => {
    const p = diet[i] ?? { tags: [], note: "" };
    return { label: `Gjest ${i + 1}`, tags: [...new Set(p.tags)] as DietTag[], note: p.note };
  });
  const hasDiet = people.some((p) => p.tags.length > 0 || p.note !== "");
  if (hasDiet && !consent) return { ok: false, error: "consent_required" };
  return { ok: true, status: "accepted", partySize, diet: hasDiet ? people : [], hasDiet };
}

/** Today's date in Oslo as YYYY-MM-DD (the deadline is a calendar date, so no timezone surprises). */
export function todayInOslo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** The deadline day itself is still open; the day after is closed. */
export function deadlinePassed(deadline: string | null, now: Date = new Date()): boolean {
  return deadline !== null && todayInOslo(now) > deadline;
}

export function rateLimited(lastRsvpAt: string | null, rsvpCount: number, now: Date = new Date()): boolean {
  if (rsvpCount >= MAX_RSVP_UPDATES) return true;
  return lastRsvpAt !== null && now.getTime() - new Date(lastRsvpAt).getTime() < RSVP_MIN_INTERVAL_MS;
}

export type SendCandidate = Pick<GuestRow, "id" | "email" | "status" | "optedOut"> & { lastSentAt: string | null };

/**
 * Who gets an e-mail now. invite: never-sent guests with an address. reminder: invited guests who have not
 * answered, not stopped, and not mailed in the last 3 days. Both respect the booking's daily cap.
 */
export function selectRecipients(
  guests: readonly SendCandidate[],
  mode: "invite" | "reminder",
  sentToday: number,
  now: Date = new Date(),
): { send: SendCandidate[]; skippedForCap: number } {
  const cooldown = REMINDER_COOLDOWN_DAYS * 86_400_000;
  const eligible = guests.filter((g) => {
    if (!g.email || g.optedOut) return false;
    if (mode === "invite") return g.status === "not_sent";
    if (g.status !== "invited") return false;
    return g.lastSentAt === null || now.getTime() - new Date(g.lastSentAt).getTime() >= cooldown;
  });
  const room = Math.max(0, MAX_DAILY_EMAILS - sentToday);
  return { send: eligible.slice(0, room), skippedForCap: Math.max(0, eligible.length - room) };
}
