import "@/components/admin/admin-shell.css";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { fetchAdminSupportNavBadgeCount } from "@/lib/admin/queries/support";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { cache } from "react";
import type { ReactNode } from "react";

const getAdminSupportNavBadgeCount = cache(fetchAdminSupportNavBadgeCount);

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requirePlatformAdmin();
  const supportOpenCount = await getAdminSupportNavBadgeCount();

  return (
    <div className="platform-admin flex min-h-svh bg-background text-foreground">
      <AdminSidebar
        className="sticky top-0 hidden h-svh shrink-0 md:flex"
        supportOpenCount={supportOpenCount}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
        <AdminHeader supportOpenCount={supportOpenCount} />
        <main className="app-main flex min-h-0 min-w-0 flex-1 flex-col text-foreground antialiased">
          <div className="app-page-inner main-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
