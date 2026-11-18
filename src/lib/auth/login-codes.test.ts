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

describe("consumeLoginCode", () => {
  type State = { row: { id: string; code_hash: string } | null; attemptResult: number | null; claimed: unknown[]; calls: string[] };

  async function load(state: State) {
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    vi.doMock("@/lib/admin/supabase-admin", () => ({
      createSupabaseAdminClient: () => ({
        rpc: async (name: string) => {
          state.calls.push(name);
          return { data: state.attemptResult };
        },
        from: () => {
          let updating = false;
          const builder: Record<string, unknown> = {};
          for (const m of ["select", "eq", "is", "gt", "order", "limit"]) builder[m] = () => builder;
          builder.update = () => {
            updating = true;
            return builder;
          };
          builder.maybeSingle = async () => ({ data: state.row });
          builder.then = (resolve: (v: unknown) => void) => {
            state.calls.push(updating ? "claim" : "read");
            resolve({ data: state.claimed });
          };
          return builder;
        },
      }),
    }));
    return import("./login-codes");
  }

  const codeRow = async (id: string, code: string) => {
    const { hashLoginCode } = await import("./login-codes");
    return { id, code_hash: hashLoginCode(id, code) };
  };

  it("accepts the right code once, counting the attempt before it compares", async () => {
    const state: State = { row: null, attemptResult: 1, claimed: [{ id: "a" }], calls: [] };
    const mod = await load(state);
    state.row = await codeRow("a", "123456");
    expect(await mod.consumeLoginCode("a@b.no", "123456")).toBe(true);
    expect(state.calls.indexOf("login_code_register_attempt")).toBeLessThan(state.calls.indexOf("claim"));
  });

  it("rejects a wrong code and never claims the row", async () => {
    const state: State = { row: null, attemptResult: 2, claimed: [{ id: "a" }], calls: [] };
    const mod = await load(state);
    state.row = await codeRow("a", "123456");
    expect(await mod.consumeLoginCode("a@b.no", "000000")).toBe(false);
    expect(state.calls).not.toContain("claim");
  });

  it("rejects even the right code when the attempt limit is used up", async () => {
    const state: State = { row: null, attemptResult: null, claimed: [{ id: "a" }], calls: [] };
    const mod = await load(state);
    state.row = await codeRow("a", "123456");
    expect(await mod.consumeLoginCode("a@b.no", "123456")).toBe(false);
    expect(state.calls).not.toContain("claim");
  });

  it("rejects when there is no unused, unexpired code, without counting anything", async () => {
    const state: State = { row: null, attemptResult: 1, claimed: [], calls: [] };
    const mod = await load(state);
    expect(await mod.consumeLoginCode("a@b.no", "123456")).toBe(false);
    expect(state.calls).not.toContain("login_code_register_attempt");
  });

  it("rejects a code that was claimed by a parallel request", async () => {
    const state: State = { row: null, attemptResult: 1, claimed: [], calls: [] };
    const mod = await load(state);
    state.row = await codeRow("a", "123456");
    expect(await mod.consumeLoginCode("a@b.no", "123456")).toBe(false);
  });
});
