import { Suspense } from "react";

import { OvernattingPageClient } from "@/components/app-pages/tenant-page-clients";
import { AppPageSkeleton } from "@/components/shared/app-page-skeleton";

export default function OvernattingPage() {
  return (
    <Suspense fallback={<AppPageSkeleton variant="calendar" />}>
      <OvernattingPageClient />
    </Suspense>
  );
}
