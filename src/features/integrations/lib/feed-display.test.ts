import { describe, expect, it } from "vitest";

import { buildFeedUrl, formatFeedTime, maskFeedUrl } from "@/features/integrations/lib/feed-display";

describe("buildFeedUrl", () => {
  it("joins origin, token and file name, ignoring a trailing slash", () => {
    expect(buildFeedUrl("https://eventmanager.no/", "abc123")).toBe("https://eventmanager.no/api/calendar/abc123/bookings.ics");
    expect(buildFeedUrl("https://eventmanager.no", "abc123")).toBe("https://eventmanager.no/api/calendar/abc123/bookings.ics");
  });
});

describe("maskFeedUrl", () => {
  it("replaces the token with dots and keeps the rest", () => {
    const masked = maskFeedUrl("https://x.no/api/calendar/secrettoken/bookings.ics");
    expect(masked).toBe("https://x.no/api/calendar/" + "•".repeat(11) + "/bookings.ics");
    expect(masked).not.toContain("secrettoken");
  });

  it("caps the number of dots so the length does not reveal the token length", () => {
    const masked = maskFeedUrl(`https://x.no/api/calendar/${"a".repeat(64)}/bookings.ics`);
    expect(masked).toContain("•".repeat(20) + "/");
    expect(masked).not.toContain("•".repeat(21));
  });
});

describe("formatFeedTime", () => {
  it("returns null for empty or invalid values", () => {
    expect(formatFeedTime(null, "nb-NO")).toBeNull();
    expect(formatFeedTime("not a date", "nb-NO")).toBeNull();
  });

  it("formats a real timestamp", () => {
    expect(formatFeedTime("2026-08-27T14:03:00Z", "nb-NO")).toMatch(/2026/);
  });
});
