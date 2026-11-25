import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUserNotifications } from "@/hooks/use-user-notifications";

const row = (id: string, organization_id: string | null) => ({
  id,
  title: id,
  body: "",
  category: "booking",
  priority: "normal",
  organization_id,
  action_url: null,
  action_label: null,
  read_at: null,
  acknowledged_at: null,
  created_at: "2026-11-14T10:00:00Z",
});

const deleteCalls: Array<{ in?: unknown; eq?: [string, unknown] }> = [];
let deleteError: { message: string } | null = null;
let rows = [row("mine-1", "org-1"), row("mine-2", "org-1"), row("other-org", "org-2")];

const fakeSupabase = {
  from: () => ({
    select: () => ({ order: () => ({ limit: async () => ({ data: rows, error: null }) }) }),
    delete: () => {
      const call: { in?: unknown; eq?: [string, unknown] } = {};
      deleteCalls.push(call);
      const chain = {
        in: (_col: string, ids: unknown) => ((call.in = ids), chain),
        eq: (col: string, val: unknown) => ((call.eq = [col, val]), chain),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ error: deleteError }).then(resolve),
      };
      return chain;
    },
  }),
  channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
  removeChannel: async () => {},
};

// Stable objects, like the real providers: a new object on every render would re-run the hook's effects forever.
const authValue = { user: { id: "user-1" }, loading: false };
const orgValue = { currentOrganizationId: "org-1" };

vi.mock("@/providers/supabase-provider", () => ({ useSupabase: () => fakeSupabase }));
vi.mock("@/providers/auth-provider", () => ({ useAuthContext: () => authValue }));
vi.mock("@/hooks/use-current-organization", () => ({ useCurrentOrganization: () => orgValue }));

beforeEach(() => {
  deleteCalls.length = 0;
  deleteError = null;
  rows = [row("mine-1", "org-1"), row("mine-2", "org-1"), row("other-org", "org-2")];
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

async function loaded() {
  const hook = renderHook(() => useUserNotifications());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe("useUserNotifications: deleteAllNotifications", () => {
  it("deletes only what the user sees for the current organization, and only their own rows", async () => {
    const { result } = await loaded();
    expect(result.current.scopedNotifications.map((n) => n.id)).toEqual(["mine-1", "mine-2"]);

    let ok = false;
    await act(async () => {
      ok = await result.current.deleteAllNotifications();
    });

    expect(ok).toBe(true);
    expect(deleteCalls).toEqual([{ in: ["mine-1", "mine-2"], eq: ["user_id", "user-1"] }]);
    expect(result.current.scopedNotifications).toEqual([]);
    expect(result.current.notifications.map((n) => n.id)).toEqual(["other-org"]); // another organization's notification is kept
  });

  it("keeps the list and reports failure when the delete fails", async () => {
    deleteError = { message: "denied" };
    const { result } = await loaded();
    let ok = true;
    await act(async () => {
      ok = await result.current.deleteAllNotifications();
    });
    expect(ok).toBe(false);
    expect(result.current.scopedNotifications).toHaveLength(2);
  });

  it("does not call the database when there is nothing to delete", async () => {
    rows = [row("other-org", "org-2")];
    const { result } = await loaded();
    let ok = false;
    await act(async () => {
      ok = await result.current.deleteAllNotifications();
    });
    expect(ok).toBe(true);
    expect(deleteCalls).toEqual([]);
  });
});
