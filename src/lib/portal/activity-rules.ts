import { z } from "zod";

import { containsLink } from "./invite-rules";
import { MAX_GUESTS } from "./guest-rules";

export const ACTIVITY_RESPONSES = ["yes", "no", "maybe"] as const;
export type ActivityResponse = (typeof ACTIVITY_RESPONSES)[number];
export type ActivityAudience = "all" | "selected";

const TZ = "Europe/Oslo";

/** Minutes Oslo is ahead of UTC at the given instant (60 in winter, 120 in summer). */
export function osloOffsetMinutes(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const v = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
  return Math.round((asUtc - utcMs) / 60_000);
}

/** "2027-06-12T14:00" typed in Oslo time -> UTC ISO string. Null for anything that is not a real local time. */
export function osloLocalToIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const check = new Date(guess);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d || h > 23 || mi > 59) return null;
  let utc = guess - osloOffsetMinutes(guess) * 60_000;
  utc = guess - osloOffsetMinutes(utc) * 60_000; // settle across a DST change
  return new Date(utc).toISOString();
}

/** UTC ISO -> "YYYY-MM-DDTHH:mm" in Oslo time, for <input type="datetime-local">. */
export function isoToOsloLocal(iso: string): string {
  const ms = new Date(iso).getTime();
  return new Date(ms + osloOffsetMinutes(ms) * 60_000).toISOString().slice(0, 16);
}

export function formatOslo(iso: string, locale: string, style: "short" | "long" = "long"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: TZ,
    weekday: style === "long" ? "long" : undefined,
    day: "numeric",
    month: style === "long" ? "long" : "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) => !containsLink(value));

export const activityInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(80).refine((v) => !containsLink(v)),
    description: text(500),
    location: text(100),
    startsAtLocal: z.string(),
    endsAtLocal: z.string().nullable().optional().default(null),
    audience: z.enum(["all", "selected"]),
    capacity: z.number().int().min(1).max(500).nullable().optional().default(null),
    guestIds: z.array(z.string().uuid()).max(MAX_GUESTS).default([]),
  })
  .superRefine((v, ctx) => {
    const start = osloLocalToIso(v.startsAtLocal);
    if (!start) return void ctx.addIssue({ code: "custom", path: ["startsAtLocal"], message: "invalid start" });
    if (v.endsAtLocal) {
      const end = osloLocalToIso(v.endsAtLocal);
      if (!end || end <= start) ctx.addIssue({ code: "custom", path: ["endsAtLocal"], message: "invalid end" });
    }
  });
export type ActivityInput = z.input<typeof activityInputSchema>;

export type ActivityRow = {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string | null;
  audience: ActivityAudience;
  capacity: number | null;
};

export type ActivityAnswer = { guestId: string; response: ActivityResponse | null; people: number | null };

export type ActivityCounts = { yesPeople: number; yesGuests: number; no: number; maybe: number; noAnswer: number; invited: number };

/**
 * Counts for one activity. Invited = everyone on the list (audience all) or the chosen guests (selected);
 * answers from guests who are no longer invited are ignored.
 */
export function countActivity(
  activity: Pick<ActivityRow, "audience">,
  allGuestIds: readonly string[],
  answers: readonly ActivityAnswer[],
): ActivityCounts {
  const invitedIds = new Set(activity.audience === "all" ? allGuestIds : answers.map((a) => a.guestId));
  const counts: ActivityCounts = { yesPeople: 0, yesGuests: 0, no: 0, maybe: 0, noAnswer: 0, invited: invitedIds.size };
  const answered = new Set<string>();
  for (const a of answers) {
    if (!invitedIds.has(a.guestId) || !a.response) continue;
    answered.add(a.guestId);
    if (a.response === "yes") {
      counts.yesGuests += 1;
      counts.yesPeople += a.people ?? 1;
    } else if (a.response === "no") counts.no += 1;
    else counts.maybe += 1;
  }
  counts.noAnswer = invitedIds.size - answered.size;
  return counts;
}

/** Answers are open until the activity is over (or has started, if it has no end). */
export function canAnswer(activity: Pick<ActivityRow, "startsAt" | "endsAt">, now: Date = new Date()): boolean {
  return new Date(activity.endsAt ?? activity.startsAt).getTime() > now.getTime();
}

export function spotsLeft(capacity: number | null, yesPeople: number): number | null {
  return capacity === null ? null : Math.max(0, capacity - yesPeople);
}
