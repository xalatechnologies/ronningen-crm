import { describe, expect, it } from "vitest";

import {
  computeAdminSupportFilterCounts,
  computeAdminSupportOverviewStats,
  matchesAdminSupportFilter,
} from "@/components/admin/admin-support-filters";
import type { AdminSupportTicket } from "@/lib/admin/queries/support";

function ticket(
  overrides: Partial<AdminSupportTicket> & Pick<AdminSupportTicket, "id">,
): AdminSupportTicket {
  return {
    organizationId: "org-1",
    organizationName: "Test Org",
    organizationSlug: "test-org",
    status: "open",
    category: "other",
    subject: "Test subject",
    noteCount: 0,
    notes: [],
    assignedToName: null,
    createdByName: null,
    ticketSource: "unknown",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeAdminSupportFilterCounts", () => {
  it("counts tickets by status", () => {
    const tickets = [
      ticket({ id: "1", status: "open" }),
      ticket({ id: "2", status: "waiting" }),
      ticket({ id: "3", status: "resolved" }),
    ];

    expect(computeAdminSupportFilterCounts(tickets)).toEqual({
      all: 3,
      open: 1,
      waiting: 1,
      resolved: 1,
    });
  });
});

describe("computeAdminSupportOverviewStats", () => {
  it("derives overview stats from tickets", () => {
    const tickets = [
      ticket({ id: "1", status: "open" }),
      ticket({ id: "2", status: "waiting" }),
      ticket({ id: "3", status: "resolved" }),
    ];

    expect(computeAdminSupportOverviewStats(tickets)).toEqual({
      total: 3,
      open: 1,
      waiting: 1,
      resolved: 1,
    });
  });
});

describe("matchesAdminSupportFilter", () => {
  it("matches search and status filters", () => {
    const open = ticket({ id: "1", organizationName: "Wahid AS", status: "open" });

    expect(matchesAdminSupportFilter(open, "all", "wahid")).toBe(true);
    expect(matchesAdminSupportFilter(open, "resolved", "")).toBe(false);
    expect(matchesAdminSupportFilter(open, "open", "")).toBe(true);
  });
});
