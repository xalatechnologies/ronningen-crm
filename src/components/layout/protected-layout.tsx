"use client";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import type { ReactNode } from "react";

export function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <AppSidebar className="sticky top-0 hidden h-svh shrink-0 md:flex" />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex min-h-0 flex-1 flex-col px-2 py-3 text-foreground antialiased md:px-4 md:py-3 lg:px-3 lg:py-3 xl:px-3 xl:py-3">
          {children}
        </main>
      </div>
    </div>
  );
}
