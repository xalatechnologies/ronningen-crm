import { describe, expect, it } from "vitest";

import {
  buildBookingActionUrl,
  buildInquiryActionUrl,
  resolveEventDefaults,
} from "@/lib/notifications/notification-events";

describe("notification-events", () => {
  it("resolves defaults for platform campaign", () => {
    expect(resolveEventDefaults("platform.campaign")).toEqual({
      category: "platform",
      priority: "high",
    });
  });

  it("returns null for unknown event keys", () => {
    expect(resolveEventDefaults("unknown.event")).toBeNull();
  });

  it("builds booking action url", () => {
    expect(buildBookingActionUrl("abc-123")).toBe("/app/bookings?booking=abc-123");
  });

  it("builds inquiry action url", () => {
    expect(buildInquiryActionUrl("inq-1")).toBe("/app/inquiries?inquiry=inq-1");
  });
});
