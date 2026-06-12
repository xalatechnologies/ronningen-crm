import { AppPageHeader } from "@/components/layout/app-page-header";
import type { ReactNode } from "react";

type AdminPageShellProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AdminPageShell({
  title,
  description,
  actions,
  children,
}: AdminPageShellProps) {
  return (
    <div className="admin-page-workspace flex min-w-0 flex-col">
      <AppPageHeader
        title={title}
        description={description}
        actions={actions}
        surface="card"
        compact
      />
      {children}
    </div>
  );
}
