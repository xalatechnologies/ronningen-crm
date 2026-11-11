import { describe, expect, it } from "vitest";

import { matchAuditActionsByLabel } from "./audit-labels";

// Minimal translator: returns the key path so matching can be asserted without a dictionary.
const t = ((key: string) => key) as unknown as Parameters<typeof matchAuditActionsByLabel>[1];

describe("matchAuditActionsByLabel", () => {
  it("returns nothing for an empty query", () => {
    expect(matchAuditActionsByLabel("  ", t)).toEqual([]);
  });

  it("finds actions whose displayed label contains the text", () => {
    const hits = matchAuditActionsByLabel("subscriptionsynced", t);
    expect(hits).toContain("organization.subscription_synced");
    expect(hits).not.toContain("organization.suspended");
  });
});
