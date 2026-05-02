import { AppPageHeader } from "@/components/layout/app-page-header";
import type { ReactNode } from "react";

export function PageShell({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="app-section">
      <AppPageHeader title={title} />
      {children ? (
        <div className="flex flex-col gap-[length:var(--spacing-app-gap)]">
          {children}
        </div>
      ) : null}
    </div>
  );
}
