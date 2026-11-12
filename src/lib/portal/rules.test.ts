import { describe, expect, it } from "vitest";

import { portalInviteExpiry, portalInviteState, shouldAutoInvite } from "./rules";

const now = new Date("2026-11-12T10:00:00Z");
const future = "2026-11-20T00:00:00Z";
const past = "2026-11-01T00:00:00Z";

describe("portalInviteState", () => {
  it("is pending before expiry", () => {
    expect(portalInviteState({ accepted_at: null, revoked_at: null, expires_at: future }, now)).toBe("pending");
  });
  it("is expired at or after expiry", () => {
    expect(portalInviteState({ accepted_at: null, revoked_at: null, expires_at: past }, now)).toBe("expired");
  });
  it("accepted wins over revoked and expired", () => {
    expect(
      portalInviteState({ accepted_at: past, revoked_at: past, expires_at: past }, now),
    ).toBe("accepted");
  });
  it("revoked wins over expired", () => {
    expect(portalInviteState({ accepted_at: null, revoked_at: past, expires_at: past }, now)).toBe("revoked");
  });
});

describe("portalInviteExpiry", () => {
  it("is 14 days out", () => {
    expect(portalInviteExpiry(now)).toBe("2026-11-26T10:00:00.000Z");
  });
});

describe("shouldAutoInvite", () => {
  it("needs the portal on AND auto-invite on", () => {
    expect(shouldAutoInvite({ portal_enabled: true, portal_auto_invite: true })).toBe(true);
    expect(shouldAutoInvite({ portal_enabled: false, portal_auto_invite: true })).toBe(false);
    expect(shouldAutoInvite({ portal_enabled: true, portal_auto_invite: false })).toBe(false);
  });
});
