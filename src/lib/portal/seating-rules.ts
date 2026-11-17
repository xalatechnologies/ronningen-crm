import { z } from "zod";

import type { GuestRow } from "./guest-rules";
import { containsLink } from "./invite-rules";

export const MAX_TABLES = 40;
export const MAX_TABLE_CAPACITY = 60;
export const DEFAULT_TABLE_CAPACITY = 8;

export const tableInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(40).refine((v) => !containsLink(v)),
  capacity: z.number().int().min(1).max(MAX_TABLE_CAPACITY).default(DEFAULT_TABLE_CAPACITY),
});
export type TableInput = z.input<typeof tableInputSchema>;

export const seatingSettingsSchema = z.object({ shared: z.boolean() });
export type SeatingSettings = z.infer<typeof seatingSettingsSchema>;

export type SeatingTable = { id: string; name: string; capacity: number };

/** Seats a guest takes: nobody when they declined, their party when they accepted, one while they have not answered. */
export function guestSeats(g: Pick<GuestRow, "status" | "partySize">): number {
  if (g.status === "declined") return 0;
  return g.status === "accepted" ? Math.max(1, g.partySize) : 1;
}

export type SeatingGuest = Pick<GuestRow, "id" | "name" | "status" | "partySize" | "groupLabel">;
export type TableWithGuests = SeatingTable & { guests: SeatingGuest[]; seatsUsed: number; over: boolean };

/**
 * Groups the guests by table. `assignments` maps guest -> table; an assignment to a table that no longer exists
 * counts as "no table". Tables keep their order; guests are sorted by name.
 */
export function buildSeating(
  tables: readonly SeatingTable[],
  assignments: ReadonlyMap<string, string>,
  guests: readonly SeatingGuest[],
): { tables: TableWithGuests[]; unassigned: SeatingGuest[] } {
  const byName = (a: SeatingGuest, b: SeatingGuest) => a.name.localeCompare(b.name);
  const known = new Set(tables.map((t) => t.id));
  const unassigned = guests.filter((g) => !known.has(assignments.get(g.id) ?? "")).sort(byName);
  return {
    tables: tables.map((t) => {
      const seated = guests.filter((g) => assignments.get(g.id) === t.id).sort(byName);
      const seatsUsed = seated.reduce((n, g) => n + guestSeats(g), 0);
      return { ...t, guests: seated, seatsUsed, over: seatsUsed > t.capacity };
    }),
    unassigned,
  };
}

/** "Bord 1", "Bord 2" ...: the first number not already used as "Bord N". */
export function nextTableName(existing: readonly string[], prefix = "Bord"): string {
  const used = new Set(existing.map((n) => n.trim().toLowerCase()));
  for (let n = 1; n <= MAX_TABLES + 1; n++) if (!used.has(`${prefix} ${n}`.toLowerCase())) return `${prefix} ${n}`;
  return `${prefix} ${existing.length + 1}`;
}
