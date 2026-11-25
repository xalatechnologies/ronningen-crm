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

describe("signup codes", () => {
  type Call = { table: string; method: string; args: unknown[] };

  /** A recording stand-in for the admin client: every query-builder call is logged, every query returns `result`. */
  async function load(result: { data: unknown; count?: number }) {
    const calls: Call[] = [];
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    vi.doMock("@/lib/admin/supabase-admin", () => ({
      createSupabaseAdminClient: () => ({
        rpc: async () => ({ data: 1 }),
        from: (table: string) => {
          const builder: Record<string, unknown> = {};
          for (const method of ["select", "eq", "is", "gt", "gte", "lt", "order", "limit", "ilike", "update", "delete", "insert"]) {
            builder[method] = (...args: unknown[]) => {
              calls.push({ table, method, args });
              return builder;
            };
          }
          builder.maybeSingle = async () => ({ data: result.data });
          builder.then = (resolve: (v: unknown) => void) => resolve({ data: result.data, count: result.count ?? 0, error: null });
          return builder;
        },
      }),
    }));
    return { mod: await import("./login-codes"), calls };
  }

  it("issues a signup code without needing an account, stored with purpose 'signup'", async () => {
    const { mod, calls } = await load({ data: null });
    const code = await mod.issueSignupCode("ny@eksempel.no");
    expect(code).toMatch(/^\d{6}$/);
    expect(calls.some((c) => c.table === "profiles")).toBe(false);
    const insert = calls.find((c) => c.method === "insert");
    expect(insert?.args[0]).toMatchObject({ email: "ny@eksempel.no", purpose: "signup" });
  });

  it("issues a sign-in code only for an existing account, stored with purpose 'login'", async () => {
    const none = await load({ data: null });
    expect(await none.mod.issueLoginCode("a@b.no")).toBeNull();
    const some = await load({ data: { id: "p1" } });
    expect(await some.mod.issueLoginCode("a@b.no")).toMatch(/^\d{6}$/);
    expect(some.calls.find((c) => c.method === "insert")?.args[0]).toMatchObject({ purpose: "login" });
  });

  it("limits requests per hour per e-mail and purpose, and sends no code over the limit", async () => {
    const { mod, calls } = await load({ data: null, count: 5 });
    expect(await mod.issueSignupCode("a@b.no")).toBeNull();
    expect(calls.filter((c) => c.method === "eq").map((c) => c.args)).toContainEqual(["purpose", "signup"]);
    expect(calls.some((c) => c.method === "insert")).toBe(false);
  });

  it("only ever looks at codes of its own purpose, so a signup code can never sign anyone in", async () => {
    const signup = await load({ data: null });
    await signup.mod.consumeSignupCode("a@b.no", "123456");
    expect(signup.calls.map((c) => c.args)).toContainEqual(["purpose", "signup"]);
    const login = await load({ data: null });
    await login.mod.consumeLoginCode("a@b.no", "123456");
    expect(login.calls.map((c) => c.args)).toContainEqual(["purpose", "login"]);
    expect(login.calls.map((c) => c.args)).not.toContainEqual(["purpose", "signup"]);
  });

  it("matches the e-mail literally when checking for an account, so '_' and '%' are not wildcards", async () => {
    const { mod, calls } = await load({ data: { id: "p1" } });
    expect(await mod.emailHasAccount("a_b%c@eksempel.no")).toBe(true);
    expect(calls.find((c) => c.method === "ilike")?.args).toEqual(["email", "a\\_b\\%c@eksempel.no"]);
    const none = await load({ data: null });
    expect(await none.mod.emailHasAccount("x@y.no")).toBe(false);
  });
});
