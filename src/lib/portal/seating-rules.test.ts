import { describe, expect, it } from "vitest";

import { buildSeating, guestSeats, nextTableName, seatingSettingsSchema, tableInputSchema, type SeatingGuest } from "./seating-rules";

const g = (id: string, name: string, status: SeatingGuest["status"] = "accepted", partySize = 1): SeatingGuest => ({ id, name, status, partySize, groupLabel: null });

describe("tableInputSchema", () => {
  it("accepts a name and defaults to 8 seats", () => {
    expect(tableInputSchema.parse({ name: "Brudebord" })).toMatchObject({ name: "Brudebord", capacity: 8 });
  });
  it("trims and rejects empty, long or link-like names", () => {
    expect(tableInputSchema.parse({ name: "  Bord 1  " }).name).toBe("Bord 1");
    expect(tableInputSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(tableInputSchema.safeParse({ name: "x".repeat(41) }).success).toBe(false);
    expect(tableInputSchema.safeParse({ name: "Se https://evil.example" }).success).toBe(false);
    expect(tableInputSchema.safeParse({ name: "gave.shop" }).success).toBe(false);
  });
  it("capacity is a whole number 1..60", () => {
    for (const capacity of [1, 8, 60]) expect(tableInputSchema.safeParse({ name: "A", capacity }).success).toBe(true);
    for (const capacity of [0, 61, -1, 2.5]) expect(tableInputSchema.safeParse({ name: "A", capacity }).success).toBe(false);
  });
  it("settings take a boolean only", () => {
    expect(seatingSettingsSchema.safeParse({ shared: true }).success).toBe(true);
    expect(seatingSettingsSchema.safeParse({ shared: "yes" }).success).toBe(false);
  });
});

describe("guestSeats", () => {
  it("counts the party for accepted, one while unanswered, none for declined", () => {
    expect(guestSeats({ status: "accepted", partySize: 3 })).toBe(3);
    expect(guestSeats({ status: "maybe", partySize: 3 })).toBe(1);
    expect(guestSeats({ status: "invited", partySize: 1 })).toBe(1);
    expect(guestSeats({ status: "declined", partySize: 2 })).toBe(0);
  });
});

describe("buildSeating", () => {
  const tables = [{ id: "t1", name: "Bord 1", capacity: 4 }, { id: "t2", name: "Bord 2", capacity: 2 }];
  const guests = [g("a", "Kari", "accepted", 2), g("b", "Ola"), g("c", "Per", "declined", 2), g("d", "Eva"), g("e", "Anna", "accepted", 3)];

  it("groups guests by table and counts seats", () => {
    const r = buildSeating(tables, new Map([["a", "t1"], ["b", "t1"], ["e", "t2"], ["c", "t2"]]), guests);
    expect(r.tables[0]).toMatchObject({ seatsUsed: 3, over: false });
    expect(r.tables[0].guests.map((x) => x.name)).toEqual(["Kari", "Ola"]);
    expect(r.tables[1]).toMatchObject({ seatsUsed: 3, over: true }); // Anna (3) + declined Per (0) in 2 seats
    expect(r.unassigned.map((x) => x.name)).toEqual(["Eva"]);
  });
  it("an assignment to a table that is gone counts as no table", () => {
    const r = buildSeating(tables, new Map([["a", "deleted"]]), guests);
    expect(r.unassigned.map((x) => x.id)).toContain("a");
    expect(r.tables.every((t) => t.guests.length === 0)).toBe(true);
  });
});

describe("nextTableName", () => {
  it("finds the first free number", () => {
    expect(nextTableName([])).toBe("Bord 1");
    expect(nextTableName(["Bord 1", "Bord 2"])).toBe("Bord 3");
    expect(nextTableName(["Bord 1", "bord 3"])).toBe("Bord 2");
    expect(nextTableName(["Brudebord"])).toBe("Bord 1");
  });
});
