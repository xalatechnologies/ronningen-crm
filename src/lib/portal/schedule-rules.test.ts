import { describe, expect, it } from "vitest";

import { scheduleContentHash } from "./schedule-hash";
import {
  canShare,
  canonicalEntries,
  endTime,
  scheduleItemInputSchema,
  shareState,
  sortEntries,
  type ScheduleEntry,
} from "./schedule-rules";

const e = (over: Partial<ScheduleEntry>): ScheduleEntry => ({
  id: "x",
  startTime: "14:00",
  durationMin: null,
  title: "Vielse",
  note: null,
  responsible: null,
  ...over,
});

describe("scheduleItemInputSchema", () => {
  it("accepts a normal item and trims", () => {
    const r = scheduleItemInputSchema.parse({ startTime: "14:00", title: "  Vielse ", durationMin: 45, note: " ", responsible: "Prest" });
    expect(r.title).toBe("Vielse");
    expect(r.note).toBeNull();
    expect(r.responsible).toBe("Prest");
  });
  it("rejects bad times, durations and empty titles", () => {
    expect(scheduleItemInputSchema.safeParse({ startTime: "24:00", title: "x" }).success).toBe(false);
    expect(scheduleItemInputSchema.safeParse({ startTime: "9:00", title: "x" }).success).toBe(false);
    expect(scheduleItemInputSchema.safeParse({ startTime: "14:60", title: "x" }).success).toBe(false);
    expect(scheduleItemInputSchema.safeParse({ startTime: "14:00", title: " " }).success).toBe(false);
    expect(scheduleItemInputSchema.safeParse({ startTime: "14:00", title: "x", durationMin: 2 }).success).toBe(false);
  });
});

describe("endTime", () => {
  it("adds the duration and wraps past midnight", () => {
    expect(endTime("14:00", 90)).toBe("15:30");
    expect(endTime("23:30", 60)).toBe("00:30");
    expect(endTime("14:00", null)).toBeNull();
  });
});

describe("sortEntries / canonicalEntries", () => {
  it("orders by time then title regardless of input order", () => {
    const a = sortEntries([e({ startTime: "18:00", title: "Middag" }), e({ startTime: "14:00", title: "Vielse" })]);
    expect(a.map((x) => x.title)).toEqual(["Vielse", "Middag"]);
  });
  it("ignores ids and input order, so the hash is stable", () => {
    const one = [e({ id: "1", startTime: "14:00" }), e({ id: "2", startTime: "18:00", title: "Middag" })];
    const two = [e({ id: "9", startTime: "18:00", title: "Middag" }), e({ id: "8", startTime: "14:00" })];
    expect(canonicalEntries(one)).toBe(canonicalEntries(two));
    expect(scheduleContentHash(one)).toBe(scheduleContentHash(two));
  });
  it("changes when any visible field changes", () => {
    const base = scheduleContentHash([e({})]);
    expect(scheduleContentHash([e({ startTime: "14:15" })])).not.toBe(base);
    expect(scheduleContentHash([e({ title: "Vielse i hagen" })])).not.toBe(base);
    expect(scheduleContentHash([e({ note: "Ta med ringer" })])).not.toBe(base);
    expect(scheduleContentHash([e({ durationMin: 30 })])).not.toBe(base);
    expect(scheduleContentHash([])).not.toBe(base);
  });
});

describe("shareState / canShare", () => {
  const h = scheduleContentHash([e({})]);
  it("empty and never-shared", () => {
    expect(shareState({ itemCount: 0, currentHash: scheduleContentHash([]), latest: null })).toEqual({ kind: "empty" });
    expect(shareState({ itemCount: 1, currentHash: h, latest: null })).toEqual({ kind: "never" });
  });
  it("shared when the hash matches, changed when it differs", () => {
    expect(shareState({ itemCount: 1, currentHash: h, latest: { version: 2, contentHash: h, acknowledged: true } })).toEqual({
      kind: "shared",
      version: 2,
      acknowledged: true,
    });
    expect(shareState({ itemCount: 1, currentHash: "other", latest: { version: 2, contentHash: h, acknowledged: false } })).toEqual({
      kind: "changed",
      version: 2,
    });
  });
  it("offers sharing only when there is something new", () => {
    expect(canShare({ kind: "never" })).toBe(true);
    expect(canShare({ kind: "changed", version: 1 })).toBe(true);
    expect(canShare({ kind: "shared", version: 1, acknowledged: false })).toBe(false);
    expect(canShare({ kind: "empty" })).toBe(false);
  });
});
