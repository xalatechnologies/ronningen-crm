"use client";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { OrganizationGate } from "@/components/organizations/organization-gate";
import { OrganizationProvider } from "@/providers/organization-provider";
import type { ReactNode } from "react";

export function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <OrganizationProvider>
      <OrganizationGate>
        <div className="flex min-h-svh bg-background text-foreground">
          <AppSidebar className="sticky top-0 hidden h-svh shrink-0 md:flex" />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
            <AppHeader />
            <main className="app-main flex min-h-0 min-w-0 flex-1 flex-col text-foreground antialiased">
              <div className="app-page-inner main-content">{children}</div>
            </main>
          </div>
        </div>
      </OrganizationGate>
    </OrganizationProvider>
  );
}
