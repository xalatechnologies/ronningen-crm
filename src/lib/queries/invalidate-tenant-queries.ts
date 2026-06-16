import type { QueryClient } from "@tanstack/react-query";

import { tenantQueryKeys } from "@/lib/queries/tenant-query-keys";

export function invalidateTenantQueries(
  queryClient: QueryClient,
  orgId: string | null,
) {
  if (!orgId) {
    void queryClient.invalidateQueries({ queryKey: tenantQueryKeys.all });
    return;
  }
  void queryClient.invalidateQueries({
    queryKey: ["tenant"],
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey.includes(orgId),
  });
}

export function invalidateBookingsQueries(
  queryClient: QueryClient,
  orgId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: tenantQueryKeys.bookings(orgId),
  });
  void queryClient.invalidateQueries({
    queryKey: tenantQueryKeys.dashboard(orgId),
  });
  void queryClient.invalidateQueries({
    queryKey: tenantQueryKeys.invoices(orgId),
  });
}

export function invalidateInquiriesQueries(
  queryClient: QueryClient,
  orgId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: tenantQueryKeys.inquiries(orgId),
  });
}

export function invalidateCustomersQueries(
  queryClient: QueryClient,
  orgId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: tenantQueryKeys.customers(orgId),
  });
}

export function invalidateFinanceQueries(
  queryClient: QueryClient,
  orgId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: tenantQueryKeys.finance(orgId),
  });
  void queryClient.invalidateQueries({
    queryKey: tenantQueryKeys.reports(orgId, new Date().getFullYear(), null),
  });
}

export function invalidatePricingQueries(
  queryClient: QueryClient,
  orgId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: tenantQueryKeys.pricing(orgId),
  });
}

export function invalidateAssetsQueries(
  queryClient: QueryClient,
  orgId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: tenantQueryKeys.assets(orgId),
  });
}

export function invalidateOvernattingQueries(
  queryClient: QueryClient,
  orgId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: ["tenant", "overnatting", orgId],
  });
}
