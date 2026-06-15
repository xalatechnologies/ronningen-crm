import "@/components/admin/admin-shell.css";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requirePlatformAdmin();

  return (
    <div className="platform-admin flex min-h-svh bg-background text-foreground">
      <AdminSidebar className="sticky top-0 hidden h-svh shrink-0 md:flex" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
        <AdminHeader />
        <main className="app-main flex min-h-0 min-w-0 flex-1 flex-col text-foreground antialiased">
          <div className="app-page-inner main-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
