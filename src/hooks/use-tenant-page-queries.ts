"use client";

import { useQuery } from "@tanstack/react-query";

import { useCurrentOrganization } from "@/hooks/use-current-organization";
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
import {
  tenantQueryKeys,
  tenantStaleTimes,
} from "@/lib/queries/tenant-query-keys";
import { useSupabase } from "@/providers/supabase-provider";

function useTenantQueryContext() {
  const supabase = useSupabase();
  const { currentOrganizationId, currentRole, loading } =
    useCurrentOrganization();

  const enabled =
    !loading && Boolean(supabase && currentOrganizationId);

  return {
    supabase,
    orgId: currentOrganizationId,
    role: currentRole,
    enabled,
  };
}

export function useDashboardQuery() {
  const { supabase, orgId, enabled } = useTenantQueryContext();
  return useQuery({
    queryKey: tenantQueryKeys.dashboard(orgId ?? ""),
    enabled: enabled && Boolean(orgId),
    staleTime: tenantStaleTimes.dashboard,
    queryFn: () => fetchDashboardData(supabase, orgId!),
  });
}

export function useBookingsQuery() {
  const { supabase, orgId, role, enabled } = useTenantQueryContext();
  return useQuery({
    queryKey: tenantQueryKeys.bookings(orgId ?? "", role),
    enabled: enabled && Boolean(orgId),
    staleTime: tenantStaleTimes.list,
    queryFn: () => fetchBookingsPageData(supabase, orgId!, role),
  });
}

export function useInquiriesQuery() {
  const { supabase, orgId, role, enabled } = useTenantQueryContext();
  return useQuery({
    queryKey: tenantQueryKeys.inquiries(orgId ?? "", role),
    enabled: enabled && Boolean(orgId),
    staleTime: tenantStaleTimes.list,
    queryFn: () => fetchInquiriesPageData(supabase, orgId!, role),
  });
}

export function useCustomersQuery() {
  const { supabase, orgId, enabled } = useTenantQueryContext();
  return useQuery({
    queryKey: tenantQueryKeys.customers(orgId ?? ""),
    enabled: enabled && Boolean(orgId),
    staleTime: tenantStaleTimes.list,
    queryFn: () => fetchCustomersPageData(supabase, orgId!),
  });
}

export function useFinanceQuery() {
  const { supabase, orgId, role, enabled } = useTenantQueryContext();
  return useQuery({
    queryKey: tenantQueryKeys.finance(orgId ?? "", role),
    enabled: enabled && Boolean(orgId),
    staleTime: tenantStaleTimes.finance,
    queryFn: () => fetchFinancePageData(supabase, orgId!, role),
  });
}

export function usePricingQuery() {
  const { supabase, orgId, enabled } = useTenantQueryContext();
  return useQuery({
    queryKey: tenantQueryKeys.pricing(orgId ?? ""),
    enabled: enabled && Boolean(orgId),
    staleTime: tenantStaleTimes.list,
    queryFn: () => fetchPricingPageData(supabase, orgId!),
  });
}

export function useInvoicesQuery() {
  const { supabase, orgId, role, enabled } = useTenantQueryContext();
  return useQuery({
    queryKey: tenantQueryKeys.invoices(orgId ?? "", role),
    enabled: enabled && Boolean(orgId),
    staleTime: tenantStaleTimes.list,
    queryFn: () => fetchInvoicesPageData(supabase, orgId!, role),
  });
}

export function useAssetsQuery() {
  const { supabase, orgId, role, enabled } = useTenantQueryContext();
  return useQuery({
    queryKey: tenantQueryKeys.assets(orgId ?? "", role),
    enabled: enabled && Boolean(orgId),
    staleTime: tenantStaleTimes.list,
    queryFn: () => fetchAssetsPageData(supabase, orgId!, role),
  });
}

export function useOvernattingQuery(ym?: string) {
  const { supabase, orgId, role, enabled } = useTenantQueryContext();
  const initialYm = resolveOvernattingYm(ym);
  return useQuery({
    queryKey: tenantQueryKeys.overnatting(orgId ?? "", initialYm, role),
    enabled: enabled && Boolean(orgId),
    staleTime: tenantStaleTimes.list,
    queryFn: () =>
      fetchOvernattingPageData(supabase, orgId!, role, initialYm),
  });
}

export function useReportsQuery(params: { year?: string; month?: string }) {
  const { supabase, orgId, enabled } = useTenantQueryContext();
  const { reportYear, focusMonth, allYears } = resolveReportsParams(params);
  return useQuery({
    queryKey: tenantQueryKeys.reports(
      orgId ?? "",
      allYears ? "all" : reportYear,
      focusMonth,
    ),
    enabled: enabled && Boolean(orgId),
    staleTime: tenantStaleTimes.reports,
    queryFn: () =>
      fetchReportsPageData(
        supabase,
        orgId!,
        reportYear,
        focusMonth,
        allYears,
      ),
  });
}
