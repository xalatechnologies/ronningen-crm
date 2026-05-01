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
        <main className="flex min-h-0 flex-1 flex-col px-4 py-5 text-foreground antialiased md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
