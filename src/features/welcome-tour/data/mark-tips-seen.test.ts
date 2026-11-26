import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const calls: Array<[string, ...unknown[]]> = [];
let updateError: { code: string } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser },
    from: (table: string) => {
      calls.push(["from", table]);
      const chain = {
        update: (payload: unknown) => (calls.push(["update", payload]), chain),
        eq: (col: string, val: unknown) => (calls.push(["eq", col, val]), chain),
        is: (col: string, val: unknown) => (calls.push(["is", col, val]), chain),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ error: updateError }).then(resolve),
      };
      return chain;
    },
  }),
}));

import { markTipsSeen } from "@/features/welcome-tour/data/mark-tips-seen";

beforeEach(() => {
  calls.length = 0;
  updateError = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

describe("markTipsSeen", () => {
  it("takes no arguments, so a caller cannot name another user", () => {
    expect(markTipsSeen.length).toBe(0);
  });

  it("sets the timestamp on the signed-in user's own profile only, and keeps an earlier one", async () => {
    expect(await markTipsSeen()).toEqual({ ok: true });
    expect(calls).toContainEqual(["from", "profiles"]);
    expect(calls).toContainEqual(["eq", "id", "user-1"]);
    expect(calls).toContainEqual(["is", "tips_seen_at", null]);
    const update = calls.find((c) => c[0] === "update")?.[1] as { tips_seen_at: string };
    expect(Object.keys(update)).toEqual(["tips_seen_at"]);
    expect(Number.isNaN(Date.parse(update.tips_seen_at))).toBe(false);
  });

  it("changes nothing when nobody is signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await markTipsSeen()).toEqual({ ok: false, error: "unauthenticated" });
    expect(calls.some((c) => c[0] === "update")).toBe(false);
  });

  it("reports a failed save without leaking the database error", async () => {
    updateError = { code: "42501" };
    expect(await markTipsSeen()).toEqual({ ok: false, error: "failed" });
  });
});
