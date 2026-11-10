"use client";

import { Input } from "@/components/ui/input";
import { usePageSearch } from "@/providers/page-search-provider";
import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import { Search } from "lucide-react";
import { usePathname } from "next/navigation";

function placeholderKeyForPath(pathname: string): TranslationKey {
  if (pathname.startsWith("/app/bookings")) return "bookings.searchPlaceholder";
  if (pathname.startsWith("/app/inquiries")) return "inquiries.searchPlaceholder";
  if (pathname.startsWith("/app/overnatting")) return "overnatting.searchPlaceholder";
  if (pathname.startsWith("/app/customers")) return "customers.searchCustomersPlaceholder";
  if (pathname.startsWith("/app/invoices")) return "invoices.searchPlaceholder";
  if (pathname.startsWith("/app/assets")) return "assets.searchPlaceholder";
  if (pathname.startsWith("/app/settings/lokaler")) return "properties.searchPlaceholder";
  return "common.actions.headerSearchPlaceholder";
}

export function AppHeaderSearch() {
  const { t } = useTranslation();
  const pathname = usePathname() ?? "";
  const { query, setQuery } = usePageSearch();

  return (
    <div className="relative min-w-0 flex-1 max-w-xl">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-rn-text-slate sm:left-4 sm:size-5"
        aria-hidden
      />
      <Input
        id="app-header-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t(placeholderKeyForPath(pathname))}
        aria-label={t("common.actions.headerSearchAria")}
        autoComplete="off"
        className="h-10 w-full rounded-md border-2 border-rn-border-strong bg-background pl-10 text-app-sm text-foreground shadow-sm sm:h-11 sm:pl-12 sm:text-app-base focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
      />
    </div>
  );
}
