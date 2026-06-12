"use client";

import {
  parseUserDetailTab,
  type UserDetailTabId,
} from "@/components/admin/user-detail/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export function useUserDetailTab(initialTab?: UserDetailTabId) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = useMemo(
    () => parseUserDetailTab(searchParams.get("tab") ?? initialTab ?? "account"),
    [initialTab, searchParams],
  );

  const setTab = useCallback(
    (nextTab: UserDetailTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === "account") {
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
