import { describe, expect, it } from "vitest";

import { safeInternalRedirect } from "./safe-redirect";

describe("safeInternalRedirect", () => {
  it("allows app, admin, and auth paths", () => {
    expect(safeInternalRedirect("/app")).toBe("/app");
    expect(safeInternalRedirect("/app/dashboard")).toBe("/app/dashboard");
    expect(safeInternalRedirect("/admin/support")).toBe("/admin/support");
    expect(safeInternalRedirect("/auth/login")).toBe("/auth/login");
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(safeInternalRedirect("https://evil.com")).toBe("/app");
    expect(safeInternalRedirect("//evil.com")).toBe("/app");
  });

  it("rejects paths outside allowed prefixes", () => {
    expect(safeInternalRedirect("/")).toBe("/app");
    expect(safeInternalRedirect("/it")).toBe("/app");
    expect(safeInternalRedirect("/api/webhooks/stripe")).toBe("/app");
  });

  it("uses custom fallback", () => {
    expect(safeInternalRedirect(undefined, "/auth/login")).toBe("/auth/login");
  });
});
