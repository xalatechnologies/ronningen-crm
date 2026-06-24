"use client";

import { useQueryClient } from "@tanstack/react-query";

import { useCurrentOrganization } from "@/hooks/use-current-organization";
import {
  invalidateAssetsQueries,
  invalidateBookingsQueries,
  invalidateCustomersQueries,
  invalidateFinanceQueries,
  invalidateInquiriesQueries,
  invalidateInvoicesQueries,
  invalidateOvernattingQueries,
  invalidatePricingQueries,
  invalidateTenantQueries,
} from "@/lib/queries/invalidate-tenant-queries";

export function useTenantDataInvalidation() {
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useCurrentOrganization();

  return {
    invalidateAll: () => invalidateTenantQueries(queryClient, currentOrganizationId),
    invalidateBookings: () => {
      if (!currentOrganizationId) return;
      invalidateBookingsQueries(queryClient, currentOrganizationId);
    },
    invalidateInquiries: () => {
      if (!currentOrganizationId) return;
      invalidateInquiriesQueries(queryClient, currentOrganizationId);
    },
    invalidateCustomers: () => {
      if (!currentOrganizationId) return;
      invalidateCustomersQueries(queryClient, currentOrganizationId);
    },
    invalidateFinance: () => {
      if (!currentOrganizationId) return;
      invalidateFinanceQueries(queryClient, currentOrganizationId);
    },
    invalidatePricing: () => {
      if (!currentOrganizationId) return;
      invalidatePricingQueries(queryClient, currentOrganizationId);
    },
    invalidateAssets: () => {
      if (!currentOrganizationId) return;
      invalidateAssetsQueries(queryClient, currentOrganizationId);
    },
    invalidateOvernatting: () => {
      if (!currentOrganizationId) return;
      invalidateOvernattingQueries(queryClient, currentOrganizationId);
    },
    invalidateInvoices: () => {
      if (!currentOrganizationId) return;
      invalidateInvoicesQueries(queryClient, currentOrganizationId);
    },
  };
}
