import { describe, expect, it } from "vitest";

import { NEW_ACCOUNT_DAYS, isNewAccount, shouldAutoShowTour } from "@/features/welcome-tour/lib/tour-state";

const now = new Date("2026-12-10T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

describe("isNewAccount", () => {
  it("is true for an account created within the last 14 days, including the last day", () => {
    expect(isNewAccount(daysAgo(0), now)).toBe(true);
    expect(isNewAccount(daysAgo(7), now)).toBe(true);
    expect(isNewAccount(daysAgo(NEW_ACCOUNT_DAYS), now)).toBe(true);
  });

  it("is false for an older account", () => {
    expect(isNewAccount(daysAgo(NEW_ACCOUNT_DAYS + 1), now)).toBe(false);
    expect(isNewAccount(daysAgo(400), now)).toBe(false);
  });

  it("is false when the date is missing or not a date", () => {
    expect(isNewAccount(null, now)).toBe(false);
    expect(isNewAccount(undefined, now)).toBe(false);
    expect(isNewAccount("", now)).toBe(false);
    expect(isNewAccount("not a date", now)).toBe(false);
  });
});

describe("shouldAutoShowTour", () => {
  const fresh = { createdAt: daysAgo(1), tipsSeenAt: null };

  it("shows for a new account that has not seen the tour", () => {
    expect(shouldAutoShowTour({ account: fresh, impersonating: false, now })).toBe(true);
  });

  it("never returns once it was finished or closed, on any device", () => {
    expect(shouldAutoShowTour({ account: { ...fresh, tipsSeenAt: daysAgo(0) }, impersonating: false, now })).toBe(false);
  });

  it("does not show to an old account", () => {
    expect(shouldAutoShowTour({ account: { createdAt: daysAgo(60), tipsSeenAt: null }, impersonating: false, now })).toBe(false);
  });

  it("does not show while support or an admin is looking in on the customer's behalf", () => {
    expect(shouldAutoShowTour({ account: fresh, impersonating: true, now })).toBe(false);
  });

  it("does not show before the account state is known", () => {
    expect(shouldAutoShowTour({ account: null, impersonating: false, now })).toBe(false);
  });
});
