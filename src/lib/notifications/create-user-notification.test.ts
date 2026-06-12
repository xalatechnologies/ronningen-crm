import { describe, expect, it, vi } from "vitest";

import { createUserNotification } from "@/lib/notifications/create-user-notification";

const insertMock = vi.fn();

vi.mock("@/lib/admin/supabase-admin", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      insert: insertMock,
    }),
  }),
}));

describe("createUserNotification", () => {
  it("returns created true on successful insert", async () => {
    insertMock.mockResolvedValueOnce({ error: null });

    const result = await createUserNotification({
      userId: "user-1",
      title: "Hei",
      body: "Melding",
      templateKey: "welcome",
      contextKey: "welcome",
    });

    expect(result).toEqual({ created: true });
  });

  it("returns created false on duplicate context_key", async () => {
    insertMock.mockResolvedValueOnce({ error: { code: "23505" } });

    const result = await createUserNotification({
      userId: "user-1",
      title: "Hei",
      body: "Melding",
      contextKey: "welcome",
    });

    expect(result).toEqual({ created: false });
  });

  it("throws on other database errors", async () => {
    insertMock.mockResolvedValueOnce({
      error: { code: "42501", message: "permission denied" },
    });

    await expect(
      createUserNotification({
        userId: "user-1",
        title: "Hei",
        body: "Melding",
        contextKey: "welcome",
      }),
    ).rejects.toEqual({ code: "42501", message: "permission denied" });
  });
});
