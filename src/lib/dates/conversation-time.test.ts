import { describe, expect, it } from "vitest";

import { formatRelativeTime, groupByDay } from "@/lib/dates/conversation-time";

const NOW = new Date("2026-11-23T12:00:00Z");

const msg = (id: string, createdAt: string) => ({ id, createdAt });

describe("formatRelativeTime", () => {
  const at = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

  it("is 'now' for the last minute and for times slightly in the future", () => {
    expect(formatRelativeTime(at(10_000), NOW, "nb")).toMatch(/nå|nå$/i);
    expect(formatRelativeTime(at(-5_000), NOW, "nb")).toMatch(/nå/i);
  });

  it("counts minutes, hours and days", () => {
    expect(formatRelativeTime(at(5 * 60_000), NOW, "nb")).toMatch(/5 minutter siden/);
    expect(formatRelativeTime(at(3 * 3_600_000), NOW, "nb")).toMatch(/3 timer siden/);
    expect(formatRelativeTime(at(24 * 3_600_000), NOW, "nb")).toMatch(/i går/);
    expect(formatRelativeTime(at(4 * 86_400_000), NOW, "nb")).toMatch(/4 døgn siden|4 dager siden/);
  });

  it("switches to a plain date after a week, with the year only when it is another year", () => {
    expect(formatRelativeTime(at(10 * 86_400_000), NOW, "nb")).toMatch(/13\. nov/);
    expect(formatRelativeTime("2025-03-02T10:00:00Z", NOW, "nb")).toMatch(/2025/);
  });

  it("returns an empty text for an invalid date", () => {
    expect(formatRelativeTime("nope", NOW, "nb")).toBe("");
  });
});

describe("groupByDay", () => {
  it("sorts oldest first and groups by Oslo day with today and yesterday labels", () => {
    const groups = groupByDay(
      [msg("3", "2026-11-23T09:00:00Z"), msg("1", "2026-07-08T11:33:00Z"), msg("2", "2026-11-22T12:00:00Z"), msg("4", "2026-11-23T10:00:00Z")],
      NOW,
    );
    expect(groups.map((g) => [g.label, g.items.map((m) => m.id)])).toEqual([
      ["date", ["1"]],
      ["yesterday", ["2"]],
      ["today", ["3", "4"]],
    ]);
  });

  it("puts a late-evening UTC message on the next Oslo day", () => {
    expect(groupByDay([msg("1", "2026-11-22T23:30:00Z")], NOW)[0]?.label).toBe("today");
  });
});
