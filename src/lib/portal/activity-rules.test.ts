import { describe, expect, it } from "vitest";

import { activityInputSchema, canAnswer, countActivity, isoToOsloLocal, osloLocalToIso, osloOffsetMinutes, spotsLeft } from "./activity-rules";

describe("Oslo time", () => {
  it("knows winter (+1) and summer (+2) offsets", () => {
    expect(osloOffsetMinutes(Date.UTC(2027, 0, 15, 12))).toBe(60);
    expect(osloOffsetMinutes(Date.UTC(2027, 5, 15, 12))).toBe(120);
  });
  it("converts typed local time to UTC across seasons", () => {
    expect(osloLocalToIso("2027-01-15T14:00")).toBe("2027-01-15T13:00:00.000Z");
    expect(osloLocalToIso("2027-06-12T14:00")).toBe("2027-06-12T12:00:00.000Z");
  });
  it("round-trips for the edit form", () => {
    for (const local of ["2027-06-12T14:00", "2027-01-15T09:30", "2027-03-28T12:00", "2027-10-31T03:30"]) {
      expect(isoToOsloLocal(osloLocalToIso(local)!)).toBe(local);
    }
  });
  it("rejects invalid local times", () => {
    for (const bad of ["", "2027-02-30T10:00", "2027-13-01T10:00", "2027-06-12 14:00", "2027-06-12T25:00", "2027-06-12T14:60", "tomorrow"]) {
      expect(osloLocalToIso(bad), bad).toBeNull();
    }
  });
});

const base = { title: "Velkomstdrink", description: "På terrassen", location: "Terrassen", startsAtLocal: "2027-06-12T13:00", audience: "all", guestIds: [] } as const;

describe("activityInputSchema", () => {
  it("accepts a normal activity", () => {
    const r = activityInputSchema.parse(base);
    expect(r.capacity).toBeNull();
    expect(r.endsAtLocal).toBeNull();
  });
  it("needs a real start and an end after the start", () => {
    expect(activityInputSchema.safeParse({ ...base, startsAtLocal: "nope" }).success).toBe(false);
    expect(activityInputSchema.safeParse({ ...base, endsAtLocal: "2027-06-12T12:00" }).success).toBe(false);
    expect(activityInputSchema.safeParse({ ...base, endsAtLocal: "2027-06-12T14:00" }).success).toBe(true);
  });
  it("bounds text, capacity and blocks links", () => {
    expect(activityInputSchema.safeParse({ ...base, title: "" }).success).toBe(false);
    expect(activityInputSchema.safeParse({ ...base, title: "x".repeat(81) }).success).toBe(false);
    expect(activityInputSchema.safeParse({ ...base, description: "se www.gave.no" }).success).toBe(false);
    expect(activityInputSchema.safeParse({ ...base, location: "https://maps.example" }).success).toBe(false);
    expect(activityInputSchema.safeParse({ ...base, capacity: 0 }).success).toBe(false);
    expect(activityInputSchema.safeParse({ ...base, capacity: 501 }).success).toBe(false);
    expect(activityInputSchema.safeParse({ ...base, audience: "everyone" }).success).toBe(false);
  });
});

describe("countActivity", () => {
  const all = ["a", "b", "c", "d"];
  it("counts people for yes and who has not answered (audience all)", () => {
    const c = countActivity({ audience: "all" }, all, [
      { guestId: "a", response: "yes", people: 3 },
      { guestId: "b", response: "no", people: null },
      { guestId: "c", response: "maybe", people: null },
    ]);
    expect(c).toEqual({ yesPeople: 3, yesGuests: 1, no: 1, maybe: 1, noAnswer: 1, invited: 4 });
  });
  it("for a selected audience, invited = the rows; unanswered rows count as no answer", () => {
    const c = countActivity({ audience: "selected" }, all, [
      { guestId: "a", response: "yes", people: 1 },
      { guestId: "b", response: null, people: null },
    ]);
    expect(c).toMatchObject({ invited: 2, yesPeople: 1, noAnswer: 1 });
  });
  it("ignores answers from guests no longer on the list (audience all)", () => {
    const c = countActivity({ audience: "all" }, ["a"], [{ guestId: "ghost", response: "yes", people: 5 }]);
    expect(c).toMatchObject({ yesPeople: 0, noAnswer: 1 });
  });
});

describe("canAnswer / spotsLeft", () => {
  const now = new Date("2027-06-12T12:00:00Z");
  it("is open until the end, or the start when there is no end", () => {
    expect(canAnswer({ startsAt: "2027-06-12T13:00:00Z", endsAt: null }, now)).toBe(true);
    expect(canAnswer({ startsAt: "2027-06-12T11:00:00Z", endsAt: null }, now)).toBe(false);
    expect(canAnswer({ startsAt: "2027-06-12T11:00:00Z", endsAt: "2027-06-12T13:00:00Z" }, now)).toBe(true);
  });
  it("spots left never goes negative", () => {
    expect(spotsLeft(null, 5)).toBeNull();
    expect(spotsLeft(10, 4)).toBe(6);
    expect(spotsLeft(10, 12)).toBe(0);
  });
});
