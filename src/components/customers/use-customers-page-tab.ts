"use client";

import {
  parseCustomersPageTab,
  type CustomersPageTabId,
} from "@/components/customers/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export function useCustomersPageTab(initialTab?: CustomersPageTabId) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = useMemo(
    () =>
      parseCustomersPageTab(
        searchParams.get("tab") ?? initialTab ?? "customers",
      ),
    [initialTab, searchParams],
  );

  const setTab = useCallback(
    (nextTab: CustomersPageTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === "customers") {
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
