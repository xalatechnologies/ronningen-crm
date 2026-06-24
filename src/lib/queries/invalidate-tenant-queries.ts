import type { QueryClient } from "@tanstack/react-query";

import { tenantQueryKeys } from "@/lib/queries/tenant-query-keys";

function invalidateTenantDomain(
  queryClient: QueryClient,
  orgId: string,
  domain: string,
) {
  void queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === "tenant" &&
      query.queryKey[1] === domain &&
      query.queryKey[2] === orgId,
  });
}

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

export function invalidateReportsQueries(
  queryClient: QueryClient,
  orgId: string,
) {
  void queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === "tenant" &&
      query.queryKey[1] === "reports" &&
      query.queryKey[2] === orgId,
  });
}

export function invalidateBookingsQueries(
  queryClient: QueryClient,
  orgId: string,
) {
  invalidateTenantDomain(queryClient, orgId, "bookings");
  void queryClient.invalidateQueries({
    queryKey: tenantQueryKeys.dashboard(orgId),
  });
  invalidateTenantDomain(queryClient, orgId, "invoices");
  invalidateReportsQueries(queryClient, orgId);
}

export function invalidateInquiriesQueries(
  queryClient: QueryClient,
  orgId: string,
) {
  invalidateTenantDomain(queryClient, orgId, "inquiries");
  invalidateReportsQueries(queryClient, orgId);
}

export function invalidateCustomersQueries(
  queryClient: QueryClient,
  orgId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: tenantQueryKeys.customers(orgId),
  });
  invalidateReportsQueries(queryClient, orgId);
}

export function invalidateFinanceQueries(
  queryClient: QueryClient,
  orgId: string,
) {
  invalidateTenantDomain(queryClient, orgId, "finance");
  invalidateReportsQueries(queryClient, orgId);
}

export function invalidatePricingQueries(
  queryClient: QueryClient,
  orgId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: tenantQueryKeys.pricing(orgId),
  });
  invalidateReportsQueries(queryClient, orgId);
}

export function invalidateAssetsQueries(
  queryClient: QueryClient,
  orgId: string,
) {
  invalidateTenantDomain(queryClient, orgId, "assets");
  invalidateReportsQueries(queryClient, orgId);
}

export function invalidateInvoicesQueries(
  queryClient: QueryClient,
  orgId: string,
) {
  invalidateTenantDomain(queryClient, orgId, "invoices");
  invalidateReportsQueries(queryClient, orgId);
}

export function invalidateOvernattingQueries(
  queryClient: QueryClient,
  orgId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: ["tenant", "overnatting", orgId],
  });
  invalidateReportsQueries(queryClient, orgId);
}
