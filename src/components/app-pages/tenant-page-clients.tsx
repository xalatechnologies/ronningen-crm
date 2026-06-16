"use client";

import { AssetsSection } from "@/components/assets/assets-section";
import { BookingsList } from "@/components/bookings/bookings-list";
import { CustomersSection } from "@/components/customers/customers-section";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { FinanceSection } from "@/components/finance/finance-section";
import { InquiriesSection } from "@/components/inquiries/inquiries-section";
import { UnpaidInvoicesSection } from "@/components/invoices/unpaid-invoices-section";
import { OvernattingSection } from "@/components/overnatting/overnatting-section";
import { PricingSection } from "@/components/pricing/pricing-section";
import { ReportsSection } from "@/components/reports/reports-section";
import { AppPageSkeleton } from "@/components/shared/app-page-skeleton";
import {
  useAssetsQuery,
  useBookingsQuery,
  useCustomersQuery,
  useDashboardQuery,
  useFinanceQuery,
  useInquiriesQuery,
  useInvoicesQuery,
  useOvernattingQuery,
  usePricingQuery,
  useReportsQuery,
} from "@/hooks/use-tenant-page-queries";
import { mergeDuplicateCustomersWithClient } from "@/lib/customers/merge-duplicate-customers";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export function DashboardPageClient() {
  const { data, isPending } = useDashboardQuery();
  if (isPending && !data) return <AppPageSkeleton variant="dashboard" />;
  if (!data) return null;
  return <DashboardHome data={data} />;
}

export function BookingsPageClient() {
  const { data, isPending } = useBookingsQuery();
  if (isPending && !data) return <AppPageSkeleton variant="table" />;
  if (!data) return null;
  return (
    <BookingsList
      bookings={data.bookings}
      loadError={data.loadError}
      canDeleteBookings={data.canDeleteBookings}
    />
  );
}

export function InquiriesPageClient() {
  const { data, isPending } = useInquiriesQuery();
  if (isPending && !data) return <AppPageSkeleton variant="table" />;
  if (!data) return null;
  return (
    <InquiriesSection
      inquiries={data.inquiries}
      properties={data.properties}
      customers={data.customers}
      canManageInquiries={data.canManageInquiries}
      loadError={data.loadError}
    />
  );
}

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

export function FinancePageClient() {
  const { data, isPending } = useFinanceQuery();
  if (isPending && !data) return <AppPageSkeleton variant="kpi" />;
  if (!data) return null;
  return (
    <FinanceSection
      transactions={data.transactions}
      properties={data.properties}
      loadError={data.loadError}
      canManageTransactions={data.canManageTransactions}
    />
  );
}

export function PricingPageClient() {
  const { data, isPending } = usePricingQuery();
  if (isPending && !data) return <AppPageSkeleton variant="table" />;
  if (!data) return null;
  return (
    <PricingSection
      packages={data.packages}
      services={data.services}
      loadError={data.loadError}
    />
  );
}

export function InvoicesPageClient() {
  const { data, isPending } = useInvoicesQuery();
  if (isPending && !data) return <AppPageSkeleton variant="table" />;
  if (!data) return null;
  return (
    <UnpaidInvoicesSection
      rows={data.rows}
      loadError={data.loadError}
      canMarkInvoicesPaid={data.canMarkInvoicesPaid}
    />
  );
}

export function AssetsPageClient() {
  const { data, isPending } = useAssetsQuery();
  if (isPending && !data) return <AppPageSkeleton variant="table" />;
  if (!data) return null;
  return (
    <AssetsSection
      assets={data.assets}
      properties={data.properties}
      loadError={data.loadError}
      canManageAssets={data.canManageAssets}
    />
  );
}

export function OvernattingPageClient() {
  const searchParams = useSearchParams();
  const ym = searchParams.get("ym") ?? undefined;
  const { data, isPending } = useOvernattingQuery(ym);
  if (isPending && !data) return <AppPageSkeleton variant="calendar" />;
  if (!data) return null;
  return (
    <OvernattingSection
      units={data.units}
      initialReservations={data.initialReservations}
      initialYm={data.initialYm}
      properties={data.properties}
      canManage={data.canManage}
      loadError={data.loadError}
      skipInitialReservationFetch
    />
  );
}

export function ReportsPageClient() {
  const searchParams = useSearchParams();
  const params = {
    year: searchParams.get("year") ?? undefined,
    month: searchParams.get("month") ?? undefined,
  };
  const { data, isPending } = useReportsQuery(params);
  if (isPending && !data) return <AppPageSkeleton variant="kpi" />;
  if (!data) return null;
  return (
    <ReportsSection
      kpis={data.kpis}
      monthlyRevenue={data.monthlyRevenue}
      eventBreakdown={data.eventBreakdown}
      facility={data.facility}
      reportYear={data.reportYear}
      calendarYearMax={data.calendarYearMax}
      focusMonth={data.focusMonth}
      reportsPeriodLabel={data.reportsPeriodLabel}
      loadError={data.loadError}
    />
  );
}
