import { z } from "zod";

export const MAX_SCHEDULE_ITEMS = 100;
export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120, 180] as const;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

export const scheduleItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  startTime: z.string().regex(TIME),
  durationMin: z.number().int().min(5).max(1440).nullable().optional().default(null),
  title: z.string().trim().min(1).max(120),
  note: text(500).optional().default(null),
  responsible: text(80).optional().default(null),
});
export type ScheduleItemInput = z.input<typeof scheduleItemInputSchema>;

/** One row of the plan as the UI and the shared snapshot see it. */
export type ScheduleEntry = {
  id: string;
  startTime: string; // "HH:MM"
  durationMin: number | null;
  title: string;
  note: string | null;
  responsible: string | null;
};

/** "14:00" + 90 -> "15:30" (wraps past midnight so a late event still reads sensibly). */
export function endTime(startTime: string, durationMin: number | null): string | null {
  if (durationMin == null) return null;
  const [h, m] = startTime.split(":").map(Number);
  const total = (h * 60 + m + durationMin) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Plan order: by start time, then title, so the same plan always sorts the same way. */
export function sortEntries<T extends Pick<ScheduleEntry, "startTime" | "title">>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title));
}

/**
 * What gets hashed: only the content the venue would see, in plan order. Ids and timestamps are
 * excluded so re-saving an item without changing it never counts as "changed since shared".
 */
export function canonicalEntries(entries: readonly ScheduleEntry[]): string {
  return JSON.stringify(
    sortEntries(entries).map((e) => [e.startTime, e.durationMin, e.title, e.note, e.responsible]),
  );
}

export type ShareState =
  | { kind: "never" }
  | { kind: "empty" }
  | { kind: "changed"; version: number }
  | { kind: "shared"; version: number; acknowledged: boolean };

/** Where the customer's plan stands against the latest shared version. */
export function shareState(input: {
  itemCount: number;
  currentHash: string;
  latest: { version: number; contentHash: string; acknowledged: boolean } | null;
}): ShareState {
  if (!input.latest) return input.itemCount === 0 ? { kind: "empty" } : { kind: "never" };
  if (input.latest.contentHash !== input.currentHash) return { kind: "changed", version: input.latest.version };
  return { kind: "shared", version: input.latest.version, acknowledged: input.latest.acknowledged };
}

/** Sharing is offered only when there is something new to share. */
export function canShare(state: ShareState): boolean {
  return state.kind === "never" || state.kind === "changed";
}
