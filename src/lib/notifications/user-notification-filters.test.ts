import { describe, expect, it } from "vitest";

import {
  countUnread,
  filterNotificationsForOrg,
  needsPopup,
  type UserNotificationRow,
} from "@/lib/notifications/user-notification-filters";

function row(
  partial: Partial<UserNotificationRow> & Pick<UserNotificationRow, "id">,
): UserNotificationRow {
  return {
    title: "Tittel",
    body: "Brødtekst",
    category: "platform",
    priority: "normal",
    organization_id: null,
    action_url: null,
    action_label: null,
    read_at: null,
    acknowledged_at: null,
    created_at: "2026-06-01T10:00:00.000Z",
    ...partial,
  };
}

describe("user-notification-filters", () => {
  it("includes platform-wide notifications for any org", () => {
    const notifications = [
      row({ id: "1", organization_id: null }),
      row({ id: "2", organization_id: "org-a" }),
    ];

    expect(filterNotificationsForOrg(notifications, "org-b")).toEqual([
      notifications[0],
    ]);
  });

  it("counts unread within org scope", () => {
    const notifications = [
      row({ id: "1", read_at: null }),
      row({ id: "2", read_at: "2026-06-02T10:00:00.000Z" }),
      row({ id: "3", organization_id: "org-a", read_at: null }),
    ];

    expect(countUnread(notifications, "org-a")).toBe(2);
  });

  it("skips popup when acknowledged or low priority", () => {
    expect(
      needsPopup(row({ id: "1", priority: "low" })),
    ).toBe(false);
    expect(
      needsPopup(
        row({
          id: "2",
          acknowledged_at: "2026-06-02T10:00:00.000Z",
        }),
      ),
    ).toBe(false);
    expect(needsPopup(row({ id: "3" }))).toBe(true);
  });
});
