"use client";

import { useOrganizationContext } from "@/providers/organization-provider";

export function useCurrentOrganization() {
  return useOrganizationContext();
}
