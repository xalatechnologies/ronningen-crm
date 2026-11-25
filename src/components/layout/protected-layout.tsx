"use client";

import { AppHeader } from "@/components/layout/app-header";
import { SkipLink } from "@/components/layout/skip-link";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NotificationAckDialog } from "@/components/notifications/notification-ack-dialog";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UserNotificationListener } from "@/components/notifications/user-notification-listener";
import { OrganizationGate } from "@/components/organizations/organization-gate";
import { InstallProvider } from "@/components/pwa/install-provider";
import { NotificationProvider } from "@/providers/notification-provider";
import { OrganizationProvider } from "@/providers/organization-provider";
import { PageSearchProvider } from "@/providers/page-search-provider";
import type { ReactNode } from "react";

export function ProtectedLayout({
  children,
  impersonationOrgId = null,
  variant = "app",
}: {
  children: ReactNode;
  impersonationOrgId?: string | null;
  /** "setup" is the first-time setup: no menu, search or notifications, only what the setup page needs. */
  variant?: "app" | "setup";
}) {
  if (variant === "setup") {
    return (
      <OrganizationProvider impersonationOrgId={impersonationOrgId}>
        <OrganizationGate>{children}</OrganizationGate>
      </OrganizationProvider>
    );
  }

  return (
    <OrganizationProvider impersonationOrgId={impersonationOrgId}>
      <OrganizationGate>
        <NotificationProvider>
          <InstallProvider placement="app">
          <PageSearchProvider>
          <UserNotificationListener />
          <NotificationAckDialog />
          <div className="flex min-h-svh bg-background text-foreground">
            <SkipLink />
            <AppSidebar className="sticky top-0 hidden h-svh shrink-0 md:flex" />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
              <AppHeader>
                <NotificationBell />
              </AppHeader>
            <main id="main-content" tabIndex={-1} className="app-main flex min-h-0 min-w-0 flex-1 flex-col text-foreground antialiased outline-none">
              <div className="app-page-inner main-content">{children}</div>
            </main>
          </div>
        </div>
          </PageSearchProvider>
          </InstallProvider>
        </NotificationProvider>
      </OrganizationGate>
    </OrganizationProvider>
  );
}
