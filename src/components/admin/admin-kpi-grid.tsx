import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function AdminKpiGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "admin-kpi-grid grid gap-[length:var(--spacing-app-gap)] sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </dl>
  );
}
