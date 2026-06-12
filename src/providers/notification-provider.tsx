"use client";

import { useUserNotifications } from "@/hooks/use-user-notifications";
import type { UserNotificationRow } from "@/lib/notifications/user-notification-filters";
import { createContext, useContext, type ReactNode } from "react";

type NotificationContextValue = ReturnType<typeof useUserNotifications>;

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const value = useUserNotifications();

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}

export type { UserNotificationRow };
