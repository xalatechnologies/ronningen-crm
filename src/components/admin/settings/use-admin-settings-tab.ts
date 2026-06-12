"use client";

import {
  parseAdminSettingsTab,
  type AdminSettingsTabId,
} from "@/components/admin/settings/admin-settings-tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export function useAdminSettingsTab(initialTab?: AdminSettingsTabId) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = useMemo(
    () =>
      parseAdminSettingsTab(
        searchParams.get("tab") ?? initialTab ?? "integrations",
      ),
    [initialTab, searchParams],
  );

  const setTab = useCallback(
    (nextTab: AdminSettingsTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === "integrations") {
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
