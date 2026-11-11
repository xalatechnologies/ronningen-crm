import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin/supabase-admin", () => ({ createSupabaseAdminClient: () => ({}) }));

import { hashLoginCode } from "./login-codes";

describe("hashLoginCode", () => {
  it("is deterministic per (id, code) and salted by the row id", () => {
    expect(hashLoginCode("a", "123456")).toBe(hashLoginCode("a", "123456"));
    expect(hashLoginCode("a", "123456")).not.toBe(hashLoginCode("b", "123456"));
    expect(hashLoginCode("a", "123456")).not.toBe(hashLoginCode("a", "123457"));
    expect(hashLoginCode("a", "123456")).toMatch(/^[0-9a-f]{64}$/);
  });
});
