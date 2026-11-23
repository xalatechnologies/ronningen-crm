import { describe, expect, it } from "vitest";

import { groupByDay } from "@/features/activity-log/lib/group-by-day";
import { auditDayKey } from "@/lib/audit/format-audit-time";

const at = (iso: string) => ({ createdAtIso: iso });

describe("auditDayKey", () => {
  it("uses the Oslo calendar day, not UTC", () => {
    // 23:30 UTC on 14 Nov is 00:30 on 15 Nov in Oslo (winter time, UTC+1).
    expect(auditDayKey("2026-11-14T23:30:00Z")).toBe("2026-11-15");
    expect(auditDayKey("2026-11-14T10:00:00Z")).toBe("2026-11-14");
  });

  it("does not throw on bad input", () => {
    expect(auditDayKey("nope")).toBe("invalid");
  });
});

describe("groupByDay", () => {
  const now = new Date("2026-11-23T10:00:00Z");

  it("labels today and yesterday and dates the rest, keeping order", () => {
    const groups = groupByDay(
      [at("2026-11-23T09:00:00Z"), at("2026-11-23T08:00:00Z"), at("2026-11-22T12:00:00Z"), at("2026-11-14T10:47:00Z")],
      now,
    );
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([
      ["today", 2],
      ["yesterday", 1],
      ["date", 1],
    ]);
    expect(groups[2]?.dayKey).toBe("2026-11-14");
  });

  it("finds yesterday across a month and a daylight-saving change", () => {
    const first = groupByDay([at("2026-10-31T12:00:00Z")], new Date("2026-11-01T12:00:00Z"));
    expect(first[0]?.label).toBe("yesterday");
    // Clocks went back on 25 Oct 2026 (a 25-hour day); 00:30 on the 26th is still "yesterday" for the 25th.
    const dst = groupByDay([at("2026-10-24T22:30:00Z")], new Date("2026-10-25T23:30:00Z"));
    expect(dst[0]?.label).toBe("yesterday");
  });

  it("returns no groups for no entries", () => {
    expect(groupByDay([], now)).toEqual([]);
  });

  it("puts a late-evening UTC entry on the next Oslo day", () => {
    const groups = groupByDay([at("2026-11-22T23:30:00Z")], now);
    expect(groups[0]?.label).toBe("today");
  });
});
