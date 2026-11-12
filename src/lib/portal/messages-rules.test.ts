import { describe, expect, it } from "vitest";

import {
  isRateLimited,
  MESSAGE_MAX_LENGTH,
  normalizeMessageBody,
  shouldEmailCustomer,
  staffNotificationContextKey,
} from "./messages-rules";

describe("normalizeMessageBody", () => {
  it("trims and normalizes line endings", () => {
    expect(normalizeMessageBody("  hei\r\nder  ")).toBe("hei\nder");
  });
  it("rejects empty, whitespace-only and non-strings", () => {
    expect(normalizeMessageBody("")).toBeNull();
    expect(normalizeMessageBody("   \n ")).toBeNull();
    expect(normalizeMessageBody(42)).toBeNull();
    expect(normalizeMessageBody(null)).toBeNull();
  });
  it("enforces the length limit", () => {
    expect(normalizeMessageBody("a".repeat(MESSAGE_MAX_LENGTH))).not.toBeNull();
    expect(normalizeMessageBody("a".repeat(MESSAGE_MAX_LENGTH + 1))).toBeNull();
  });
});

describe("isRateLimited", () => {
  it("allows up to 9 in a minute and blocks the 11th", () => {
    expect(isRateLimited(9)).toBe(false);
    expect(isRateLimited(10)).toBe(true);
  });
});

describe("shouldEmailCustomer", () => {
  const now = new Date("2026-11-13T12:00:00Z");
  it("emails when never emailed", () => {
    expect(shouldEmailCustomer(null, now)).toBe(true);
  });
  it("throttles inside 15 minutes and allows after", () => {
    expect(shouldEmailCustomer("2026-11-13T11:50:00Z", now)).toBe(false);
    expect(shouldEmailCustomer("2026-11-13T11:45:00Z", now)).toBe(true);
  });
});

describe("staffNotificationContextKey", () => {
  it("is stable per unread streak", () => {
    expect(staffNotificationContextKey("b1", "m1")).toBe("portal_message:b1:m1");
  });
});
