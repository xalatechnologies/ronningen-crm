import { describe, expect, it } from "vitest";

import {
  assignableRoles,
  canChangeMemberRole,
  canRemoveMember,
  canManageAssets,
  canManageBookings,
  canManageFinance,
  canManageMembers,
  canAccessRoute,
  isAdmin,
  isOwner,
} from "@/lib/organizations/organization-permissions";

describe("organization-permissions", () => {
  describe("isOwner / isAdmin", () => {
    it("owner is owner but not admin role", () => {
      expect(isOwner("owner")).toBe(true);
      expect(isAdmin("owner")).toBe(false);
    });

    it("admin is admin but not owner", () => {
      expect(isOwner("admin")).toBe(false);
      expect(isAdmin("admin")).toBe(true);
    });

    it("null role is neither", () => {
      expect(isOwner(null)).toBe(false);
      expect(isAdmin(null)).toBe(false);
    });
  });

  describe("canManageFinance", () => {
    it.each(["owner", "admin", "accountant"] as const)("allows %s", (role) => {
      expect(canManageFinance(role)).toBe(true);
    });

    it.each(["manager", "viewer"] as const)("denies %s", (role) => {
      expect(canManageFinance(role)).toBe(false);
    });
  });

  describe("canManageBookings", () => {
    it.each(["owner", "admin", "manager"] as const)("allows %s", (role) => {
      expect(canManageBookings(role)).toBe(true);
    });

    it.each(["accountant", "viewer"] as const)("denies %s", (role) => {
      expect(canManageBookings(role)).toBe(false);
    });
  });

  describe("canManageMembers", () => {
    it.each(["owner", "admin"] as const)("allows %s", (role) => {
      expect(canManageMembers(role)).toBe(true);
    });

    it.each(["manager", "accountant", "viewer"] as const)("denies %s", (role) => {
      expect(canManageMembers(role)).toBe(false);
    });
  });

  describe("canManageAssets", () => {
    it("matches booking permissions", () => {
      expect(canManageAssets("manager")).toBe(true);
      expect(canManageAssets("viewer")).toBe(false);
    });
  });

  describe("canAccessRoute", () => {
    it("currently allows all routes when role is set (documented gap)", () => {
      expect(canAccessRoute("viewer", "/app/finance")).toBe(true);
      expect(canAccessRoute(null, "/app/dashboard")).toBe(false);
    });
  });

  describe("team hierarchy", () => {
    it("owners hand out every role except owner; admins only the roles below them", () => {
      expect(assignableRoles("owner")).toEqual(["admin", "manager", "accountant", "viewer"]);
      expect(assignableRoles("admin")).toEqual(["manager", "accountant", "viewer"]);
      expect(assignableRoles("manager")).toEqual([]);
      expect(assignableRoles(null)).toEqual([]);
    });

    it("an admin cannot change or remove owners or other admins", () => {
      for (const target of ["owner", "admin"] as const) {
        expect(canChangeMemberRole("admin", target)).toBe(false);
        expect(canRemoveMember("admin", target)).toBe(false);
      }
      expect(canChangeMemberRole("admin", "viewer")).toBe(true);
      expect(canRemoveMember("admin", "manager")).toBe(true);
    });

    it("an owner can manage admins and remove co-owners, but never changes an owner's role here", () => {
      expect(canChangeMemberRole("owner", "admin")).toBe(true);
      expect(canRemoveMember("owner", "owner")).toBe(true);
      expect(canChangeMemberRole("owner", "owner")).toBe(false);
    });

    it("managers, accountants and viewers manage nobody", () => {
      for (const actor of ["manager", "accountant", "viewer"] as const) {
        expect(canRemoveMember(actor, "viewer")).toBe(false);
        expect(canChangeMemberRole(actor, "viewer")).toBe(false);
      }
    });
  });
});
