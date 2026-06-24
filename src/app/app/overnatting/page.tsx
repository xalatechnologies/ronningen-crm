import { Suspense } from "react";

import { OvernattingPageClient } from "@/components/app-pages/overnatting-page-client";
import { AppPageSkeleton } from "@/components/shared/app-page-skeleton";

export default function OvernattingPage() {
  return (
    <Suspense fallback={<AppPageSkeleton variant="calendar" />}>
      <OvernattingPageClient />
    </Suspense>
  );
}
