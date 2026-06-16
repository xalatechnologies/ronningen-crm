import type { QueryClient } from "@tanstack/react-query";

import { fetchAssetsPageData } from "@/lib/queries/fetch-assets";
import { fetchBookingsPageData } from "@/lib/queries/fetch-bookings";
import { fetchCustomersPageData } from "@/lib/queries/fetch-customers";
import { fetchDashboardData } from "@/lib/queries/fetch-dashboard";
import { fetchFinancePageData } from "@/lib/queries/fetch-finance";
import { fetchInquiriesPageData } from "@/lib/queries/fetch-inquiries";
import { fetchInvoicesPageData } from "@/lib/queries/fetch-invoices";
import {
  fetchOvernattingPageData,
  resolveOvernattingYm,
} from "@/lib/queries/fetch-overnatting";
import { fetchPricingPageData } from "@/lib/queries/fetch-pricing";
import {
  fetchReportsPageData,
  resolveReportsParams,
} from "@/lib/queries/fetch-reports";
import type { TenantSupabaseClient } from "@/lib/queries/types";
import {
  tenantQueryKeys,
  tenantStaleTimes,
} from "@/lib/queries/tenant-query-keys";
import type { UserRole } from "@/constants/roles";

const ROUTE_PATHS = {
  dashboard: "/app/dashboard",
  bookings: "/app/bookings",
  inquiries: "/app/inquiries",
  customers: "/app/customers",
  pricing: "/app/pricing",
  finance: "/app/finance",
  invoices: "/app/invoices",
  assets: "/app/assets",
  overnatting: "/app/overnatting",
  reports: "/app/reports",
} as const;

const routePrefetchers: Record<
  string,
  (
    queryClient: QueryClient,
    supabase: TenantSupabaseClient,
    orgId: string,
    role: UserRole | null,
  ) => Promise<void>
> = {
  [ROUTE_PATHS.dashboard]: async (qc, supabase, orgId) => {
    await qc.prefetchQuery({
      queryKey: tenantQueryKeys.dashboard(orgId),
      staleTime: tenantStaleTimes.dashboard,
      queryFn: () => fetchDashboardData(supabase, orgId),
    });
  },
  [ROUTE_PATHS.bookings]: async (qc, supabase, orgId, role) => {
    await qc.prefetchQuery({
      queryKey: tenantQueryKeys.bookings(orgId),
      staleTime: tenantStaleTimes.list,
      queryFn: () => fetchBookingsPageData(supabase, orgId, role),
    });
  },
  [ROUTE_PATHS.inquiries]: async (qc, supabase, orgId, role) => {
    await qc.prefetchQuery({
      queryKey: tenantQueryKeys.inquiries(orgId),
      staleTime: tenantStaleTimes.list,
      queryFn: () => fetchInquiriesPageData(supabase, orgId, role),
    });
  },
  [ROUTE_PATHS.customers]: async (qc, supabase, orgId) => {
    await qc.prefetchQuery({
      queryKey: tenantQueryKeys.customers(orgId),
      staleTime: tenantStaleTimes.list,
      queryFn: () => fetchCustomersPageData(supabase, orgId),
    });
  },
  [ROUTE_PATHS.pricing]: async (qc, supabase, orgId) => {
    await qc.prefetchQuery({
      queryKey: tenantQueryKeys.pricing(orgId),
      staleTime: tenantStaleTimes.list,
      queryFn: () => fetchPricingPageData(supabase, orgId),
    });
  },
  [ROUTE_PATHS.finance]: async (qc, supabase, orgId, role) => {
    await qc.prefetchQuery({
      queryKey: tenantQueryKeys.finance(orgId),
      staleTime: tenantStaleTimes.finance,
      queryFn: () => fetchFinancePageData(supabase, orgId, role),
    });
  },
  [ROUTE_PATHS.invoices]: async (qc, supabase, orgId, role) => {
    await qc.prefetchQuery({
      queryKey: tenantQueryKeys.invoices(orgId),
      staleTime: tenantStaleTimes.list,
      queryFn: () => fetchInvoicesPageData(supabase, orgId, role),
    });
  },
  [ROUTE_PATHS.assets]: async (qc, supabase, orgId, role) => {
    await qc.prefetchQuery({
      queryKey: tenantQueryKeys.assets(orgId),
      staleTime: tenantStaleTimes.list,
      queryFn: () => fetchAssetsPageData(supabase, orgId, role),
    });
  },
  [ROUTE_PATHS.overnatting]: async (qc, supabase, orgId, role) => {
    const ym = resolveOvernattingYm(undefined);
    await qc.prefetchQuery({
      queryKey: tenantQueryKeys.overnatting(orgId, ym),
      staleTime: tenantStaleTimes.list,
      queryFn: () => fetchOvernattingPageData(supabase, orgId, role, ym),
    });
  },
  [ROUTE_PATHS.reports]: async (qc, supabase, orgId) => {
    const { reportYear, focusMonth, calendarYearMax } = resolveReportsParams({});
    await qc.prefetchQuery({
      queryKey: tenantQueryKeys.reports(orgId, reportYear, focusMonth),
      staleTime: tenantStaleTimes.reports,
      queryFn: () =>
        fetchReportsPageData(
          supabase,
          orgId,
          reportYear,
          focusMonth,
          calendarYearMax,
        ),
    });
  },
};

export function prefetchTenantRoute(
  queryClient: QueryClient,
  supabase: TenantSupabaseClient,
  orgId: string,
  role: UserRole | null,
  href: string,
) {
  const base = href.split("?")[0] ?? href;
  const prefetch = routePrefetchers[base];
  if (!prefetch) return;
  void prefetch(queryClient, supabase, orgId, role);
}
