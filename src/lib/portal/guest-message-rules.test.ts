import { describe, expect, it } from "vitest";

import { containsLink, guestMessageSchema, messageRecipients, normalizeMessageBody } from "./guest-message-rules";

const guest = (id: string, status: "not_sent" | "invited" | "accepted" | "declined" | "maybe", extra: { email?: string | null; optedOut?: boolean } = {}) => ({
  id,
  status,
  email: extra.email === undefined ? `${id}@x.no` : extra.email,
  optedOut: extra.optedOut ?? false,
});

describe("guestMessageSchema", () => {
  const ok = { subject: "Parkering", body: "Husk å parkere ved kirken.", audience: "all" as const, activityId: null };
  it("accepts a plain message", () => expect(guestMessageSchema.safeParse(ok).success).toBe(true));
  it("rejects empty subject or body", () => {
    expect(guestMessageSchema.safeParse({ ...ok, subject: "  " }).success).toBe(false);
    expect(guestMessageSchema.safeParse({ ...ok, body: "" }).success).toBe(false);
  });
  it("rejects too long text", () => {
    expect(guestMessageSchema.safeParse({ ...ok, subject: "x".repeat(81) }).success).toBe(false);
    expect(guestMessageSchema.safeParse({ ...ok, body: "x".repeat(2001) }).success).toBe(false);
  });
  it("needs an activity exactly when the audience is an activity", () => {
    expect(guestMessageSchema.safeParse({ ...ok, audience: "activity" }).success).toBe(false);
    expect(guestMessageSchema.safeParse({ ...ok, activityId: "6f1d2c1e-7b0a-4c1e-9d3e-1a2b3c4d5e6f" }).success).toBe(false);
    expect(guestMessageSchema.safeParse({ ...ok, audience: "activity", activityId: "6f1d2c1e-7b0a-4c1e-9d3e-1a2b3c4d5e6f" }).success).toBe(true);
  });
  it("keeps the subject on one line and rejects control characters", () => {
    expect(guestMessageSchema.safeParse({ ...ok, subject: "a\nb" }).success).toBe(false);
    expect(guestMessageSchema.safeParse({ ...ok, body: "a\u0000b" }).success).toBe(false);
    expect(guestMessageSchema.safeParse({ ...ok, body: "line one\nline two" }).success).toBe(true);
  });
});

describe("containsLink", () => {
  it.each(["https://evil.example", "http://a.b", "www.evil.no", "gå til evil.com nå", "mail oss på hei.no"])("finds a link in %s", (text) => expect(containsLink(text)).toBe(true));
  it.each(["Husk å parkere ved kirken", "Vi starter kl. 14.30", "Takk for alt, hilsen Anna og Per"])("allows %s", (text) => expect(containsLink(text)).toBe(false));
});

describe("normalizeMessageBody", () => {
  it("keeps line breaks, collapses blank runs and trims", () => {
    expect(normalizeMessageBody("  a\r\n\r\n\r\n\r\nb\r\nc  ")).toBe("a\n\nb\nc");
  });
});

describe("messageRecipients", () => {
  const guests = [
    guest("a", "accepted"),
    guest("b", "invited"),
    guest("c", "maybe"),
    guest("d", "declined"),
    guest("e", "not_sent"),
    guest("f", "accepted", { email: null }),
    guest("g", "accepted", { optedOut: true }),
  ];
  it("all: everyone with an address who has not stopped e-mails", () => expect(messageRecipients(guests, "all", null)).toEqual(["a", "b", "c", "d", "e"]));
  it("accepted / maybe / noAnswer", () => {
    expect(messageRecipients(guests, "accepted", null)).toEqual(["a"]);
    expect(messageRecipients(guests, "maybe", null)).toEqual(["c"]);
    expect(messageRecipients(guests, "noAnswer", null)).toEqual(["b"]);
  });
  it("activity: only the invited guests, and none without a chosen activity", () => {
    expect(messageRecipients(guests, "activity", new Set(["a", "d", "g"]))).toEqual(["a", "d"]);
    expect(messageRecipients(guests, "activity", null)).toEqual([]);
  });
});
