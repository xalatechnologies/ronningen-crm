"use client";

import {
  parseOrganizationDetailTab,
  type OrganizationDetailTabId,
} from "@/components/admin/organization-detail/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export function useOrganizationDetailTab(initialTab?: OrganizationDetailTabId) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = useMemo(
    () =>
      parseOrganizationDetailTab(
        searchParams.get("tab") ?? initialTab ?? "profile",
      ),
    [initialTab, searchParams],
  );

  const setTab = useCallback(
    (nextTab: OrganizationDetailTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === "profile") {
        params.delete("tab");
      } else {
        params.set("tab", nextTab);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  return { tab, setTab };
}
