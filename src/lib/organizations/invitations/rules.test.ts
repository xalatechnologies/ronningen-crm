import { describe, expect, it } from "vitest";

import {
  INVITATION_TTL_DAYS,
  canInviteRole,
  invitationExpiry,
  invitationState,
} from "./rules";

const now = new Date("2026-11-11T12:00:00.000Z");
const future = "2026-11-15T12:00:00.000Z";
const past = "2026-11-10T12:00:00.000Z";

describe("invitationState", () => {
  it("is pending until accepted, revoked or expired", () => {
    expect(invitationState({ accepted_at: null, revoked_at: null, expires_at: future }, now)).toBe("pending");
    expect(invitationState({ accepted_at: null, revoked_at: null, expires_at: past }, now)).toBe("expired");
    expect(invitationState({ accepted_at: null, revoked_at: past, expires_at: future }, now)).toBe("revoked");
  });

  it("accepted wins over every other state", () => {
    expect(invitationState({ accepted_at: past, revoked_at: past, expires_at: past }, now)).toBe("accepted");
  });
});

describe("invitationExpiry", () => {
  it("expires after the configured number of days", () => {
    const diffDays =
      (new Date(invitationExpiry(now)).getTime() - now.getTime()) / 86_400_000;
    expect(diffDays).toBe(INVITATION_TTL_DAYS);
  });
});

describe("canInviteRole", () => {
  it("follows the team hierarchy", () => {
    expect(canInviteRole("owner", "admin")).toBe(true);
    expect(canInviteRole("admin", "admin")).toBe(false);
    expect(canInviteRole("admin", "viewer")).toBe(true);
    expect(canInviteRole("manager", "viewer")).toBe(false);
    expect(canInviteRole("owner", "owner")).toBe(false);
  });
});
