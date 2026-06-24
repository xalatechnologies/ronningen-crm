import { Suspense } from "react";

import { ReportsPageClient } from "@/components/app-pages/reports-page-client";
import { AppPageSkeleton } from "@/components/shared/app-page-skeleton";

export default function ReportsPage() {
  return (
    <Suspense fallback={<AppPageSkeleton variant="kpi" />}>
      <ReportsPageClient />
    </Suspense>
  );
}
