import { describe, expect, it } from "vitest";

import {
  memberActions,
  memberDisplayName,
  removeError,
  roleChangeError,
  type TeamMemberRow,
} from "@/features/team/lib/member-rules";

const member = (role: TeamMemberRow["role"], extra: Partial<TeamMemberRow> = {}): TeamMemberRow => ({
  id: "m1",
  userId: "u1",
  role,
  createdAtIso: "2026-01-01T00:00:00Z",
  fullName: null,
  email: null,
  ...extra,
});

describe("memberDisplayName", () => {
  it("prefers the full name, then the email, then the fallback", () => {
    expect(memberDisplayName({ fullName: " Ola ", email: "o@x.no" }, "Medlemmet")).toBe("Ola");
    expect(memberDisplayName({ fullName: "  ", email: "o@x.no" }, "Medlemmet")).toBe("o@x.no");
    expect(memberDisplayName({ fullName: null, email: null }, "Medlemmet")).toBe("Medlemmet");
  });
});

describe("memberActions", () => {
  it("never allows changing or removing yourself", () => {
    expect(memberActions("owner", member("owner"), true)).toEqual({ mayChangeRole: false, mayRemove: false });
  });

  it("lets an owner manage a manager", () => {
    expect(memberActions("owner", member("manager"), false)).toEqual({ mayChangeRole: true, mayRemove: true });
  });

  it("stops an admin from touching another admin or the owner", () => {
    expect(memberActions("admin", member("admin"), false)).toEqual({ mayChangeRole: false, mayRemove: false });
    expect(memberActions("admin", member("owner"), false)).toEqual({ mayChangeRole: false, mayRemove: false });
  });

  it("gives a viewer no actions", () => {
    expect(memberActions("viewer", member("manager"), false)).toEqual({ mayChangeRole: false, mayRemove: false });
  });
});

describe("roleChangeError", () => {
  it("allows an admin to move a manager to accountant", () => {
    expect(roleChangeError("admin", member("manager"), "accountant", 1)).toBeNull();
  });

  it("refuses handing out a role at or above your own", () => {
    expect(roleChangeError("admin", member("manager"), "admin", 1)).toBe("locked");
    expect(roleChangeError("owner", member("manager"), "owner", 1)).toBe("locked");
  });

  it("refuses changing someone you may not manage", () => {
    expect(roleChangeError("admin", member("owner"), "viewer", 2)).toBe("locked");
  });
});

describe("removeError", () => {
  it("allows an owner to remove a viewer", () => {
    expect(removeError("owner", member("viewer"), 1, false)).toBeNull();
  });

  it("protects the last owner", () => {
    expect(removeError("owner", member("owner"), 1, false)).toBe("last_owner");
  });

  it("refuses removing yourself", () => {
    expect(removeError("owner", member("owner"), 2, true)).toBe("self");
  });

  it("refuses when the role is above yours", () => {
    expect(removeError("admin", member("owner"), 2, false)).toBe("locked");
  });
});
