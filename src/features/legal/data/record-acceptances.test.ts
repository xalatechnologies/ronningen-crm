import { describe, expect, it, vi } from "vitest";

import { recordAcceptances } from "@/features/legal/data/record-acceptances";
import { LEGAL_DOCUMENTS } from "@/features/legal/lib/legal-documents";

function fakeAdmin(error: unknown = null) {
  const upsert = vi.fn().mockResolvedValue({ error });
  const from = vi.fn(() => ({ upsert }));
  return { admin: { from } as never, from, upsert };
}

describe("recordAcceptances", () => {
  it("saves one row per agreement, at its current version, for the given user only", async () => {
    const { admin, from, upsert } = fakeAdmin();
    expect(await recordAcceptances(admin, "user-1")).toBe(true);
    expect(from).toHaveBeenCalledWith("terms_acceptances");
    const rows = upsert.mock.calls[0]![0] as Array<{ user_id: string; document: string; version: string }>;
    expect(rows).toEqual(LEGAL_DOCUMENTS.map((d) => ({ user_id: "user-1", document: d.key, version: d.version })));
  });

  it("reports failure when saving fails", async () => {
    const { admin } = fakeAdmin({ message: "boom" });
    expect(await recordAcceptances(admin, "user-1")).toBe(false);
  });
});
