import { describe, expect, it } from "vitest";

import { activityHref, entryRange, parseActivityQuery } from "@/features/activity-log/lib/activity-query";

describe("parseActivityQuery", () => {
  it("defaults to page 1 and no filters", () => {
    expect(parseActivityQuery({})).toEqual({ page: 1, table: null, kind: null });
  });

  it("accepts known filters and a positive page", () => {
    expect(parseActivityQuery({ page: "3", table: "bookings", kind: "deleted" })).toEqual({
      page: 3,
      table: "bookings",
      kind: "deleted",
    });
  });

  it("ignores unknown filters and bad pages", () => {
    expect(parseActivityQuery({ page: "-2", table: "users; drop", kind: "x" })).toEqual({ page: 1, table: null, kind: null });
    expect(parseActivityQuery({ page: "abc" }).page).toBe(1);
  });
});

describe("activityHref", () => {
  it("leaves out defaults", () => {
    expect(activityHref({ page: 1, table: null, kind: null })).toBe("/app/settings/activity");
  });

  it("keeps both filters and the page", () => {
    expect(activityHref({ page: 2, table: "customers", kind: "created" })).toBe(
      "/app/settings/activity?table=customers&kind=created&page=2",
    );
  });
});

describe("entryRange", () => {
  it("is 0 to 0 when empty", () => {
    expect(entryRange(1, 50, 0)).toEqual({ from: 0, to: 0 });
  });

  it("counts a full first page and a short last page", () => {
    expect(entryRange(1, 50, 120)).toEqual({ from: 1, to: 50 });
    expect(entryRange(3, 50, 120)).toEqual({ from: 101, to: 120 });
  });
});
