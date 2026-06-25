import { Suspense } from "react";

import { CustomersPageClient } from "@/components/app-pages/customers-page-client";
import { AppPageSkeleton } from "@/components/shared/app-page-skeleton";

export default function CustomersPage() {
  return (
    <Suspense fallback={<AppPageSkeleton variant="table" />}>
      <CustomersPageClient />
    </Suspense>
  );
}
