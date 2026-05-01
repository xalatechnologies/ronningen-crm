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
    <div className="flex flex-col gap-6">
      <AppPageHeader title={title} />
      {children ? <div className="flex flex-col gap-4">{children}</div> : null}
    </div>
  );
}
