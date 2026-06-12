"use client";

import { needsPopup } from "@/lib/notifications/user-notification-filters";
import { useNotifications } from "@/providers/notification-provider";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const TOAST_DURATION_MS = 12_000;

export function UserNotificationListener() {
  const { scopedNotifications, acknowledge } = useNotifications();
  const shownIdsRef = useRef(new Set<string>());

  useEffect(() => {
    for (const notification of scopedNotifications) {
      if (!needsPopup(notification)) continue;
      if (notification.priority === "high") continue;
      if (notification.priority === "low") continue;
      if (shownIdsRef.current.has(notification.id)) continue;

      shownIdsRef.current.add(notification.id);

      toast(notification.title, {
        description: notification.body,
        duration: TOAST_DURATION_MS,
        action: {
          label: "OK",
          onClick: () => {
            void acknowledge(notification.id);
          },
        },
      });
    }
  }, [scopedNotifications, acknowledge]);

  return null;
}
