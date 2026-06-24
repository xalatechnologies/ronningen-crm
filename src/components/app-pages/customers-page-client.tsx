"use client";

import { AppPageSkeleton } from "@/components/shared/app-page-skeleton";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useCustomersQuery } from "@/hooks/use-tenant-page-queries";
import { mergeDuplicateCustomersWithClient } from "@/lib/customers/merge-duplicate-customers";
import { useSupabase } from "@/providers/supabase-provider";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

const CustomersSection = dynamic(
  () =>
    import("@/components/customers/customers-section").then((m) => ({
      default: m.CustomersSection,
    })),
  { loading: () => <AppPageSkeleton variant="table" /> },
);

const CUSTOMERS_MERGE_SESSION_PREFIX = "customers-merge-done:";

export function CustomersPageClient() {
  const { data, isPending, refetch } = useCustomersQuery();
  const supabase = useSupabase();
  const { currentOrganizationId, currentRole } = useCurrentOrganization();
  const mergeStarted = useRef(false);

  useEffect(() => {
    if (mergeStarted.current) return;
    if (!data || !currentOrganizationId || !supabase) return;
    if (currentRole !== "owner" && currentRole !== "admin") return;

    const sessionKey = `${CUSTOMERS_MERGE_SESSION_PREFIX}${currentOrganizationId}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(sessionKey)) {
      return;
    }

    mergeStarted.current = true;
    void (async () => {
      await mergeDuplicateCustomersWithClient(
        supabase,
        currentOrganizationId,
        currentRole,
      );
      if (typeof window !== "undefined") {
        sessionStorage.setItem(sessionKey, "1");
      }
      void refetch();
    })();
  }, [currentOrganizationId, currentRole, data, refetch, supabase]);

  if (isPending && !data) return <AppPageSkeleton variant="table" />;
  if (!data) return null;
  return (
    <CustomersSection
      customers={data.customers}
      partners={data.partners}
      bookings={data.bookings}
      loadError={data.loadError}
    />
  );
}
