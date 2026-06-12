"use client";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NotificationAckDialog } from "@/components/notifications/notification-ack-dialog";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UserNotificationListener } from "@/components/notifications/user-notification-listener";
import { OrganizationGate } from "@/components/organizations/organization-gate";
import { NotificationProvider } from "@/providers/notification-provider";
import { OrganizationProvider } from "@/providers/organization-provider";
import type { ReactNode } from "react";

export function ProtectedLayout({
  children,
  impersonationOrgId = null,
}: {
  children: ReactNode;
  impersonationOrgId?: string | null;
}) {
  return (
    <OrganizationProvider impersonationOrgId={impersonationOrgId}>
      <OrganizationGate>
        <NotificationProvider>
          <UserNotificationListener />
          <NotificationAckDialog />
          <div className="flex min-h-svh bg-background text-foreground">
            <AppSidebar className="sticky top-0 hidden h-svh shrink-0 md:flex" />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
              <AppHeader>
                <NotificationBell />
              </AppHeader>
            <main className="app-main flex min-h-0 min-w-0 flex-1 flex-col text-foreground antialiased">
              <div className="app-page-inner main-content">{children}</div>
            </main>
          </div>
        </div>
        </NotificationProvider>
      </OrganizationGate>
    </OrganizationProvider>
  );
}
