"use client";

import { useTranslation } from "@/i18n/client";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { Input } from "@/components/ui/input";
import type { GlobalSearchResults, GlobalSearchGroupType } from "@/lib/admin/queries/global-search";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { TranslationKey } from "@/i18n/types";

const GROUP_LABEL_KEYS: Record<GlobalSearchGroupType, TranslationKey> = {
  organizations: "admin.global_search_group_organizations",
  users: "admin.global_search_group_users",
  customers: "admin.global_search_group_customers",
  bookings: "admin.global_search_group_bookings",
};

export function AdminGlobalSearchWorkspace({
  query,
  results,
}: {
  query: string;
  results: GlobalSearchResults | null;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [value, setValue] = useState(query);
  const groupLabel = useCallback(
    (type: GlobalSearchGroupType) => t(GROUP_LABEL_KEYS[type]),
    [t],
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      router.push("/admin/search");
      return;
    }
    router.push(`/admin/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <AdminPageShell
      title={t("admin.global_search_title")}
      description={t("admin.sok_pa_tvers_av_organisasjoner_brukere_kunder_og_bookinger")}
    >
      <form onSubmit={handleSubmit} className="max-w-xl">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("admin.sok")}
          aria-label={t("admin.globalt_adminsok")}
        />
      </form>

      {results ? (
        <div className="mt-6 flex flex-col gap-6">
          {results.groups.length === 0 ? (
            <p className="app-text-muted">{t("adminLabels.empty.noSearchResults", { query: results.query })}</p>
          ) : (
            results.groups.map((group) => (
              <AdminDataPanel key={group.type}>
                <h2 className="app-section-title">{groupLabel(group.type)}</h2>
                <ul className="mt-4 divide-y divide-rn-border-strong/40">
                  {group.items.map((item) => (
                    <li key={item.id} className="py-3">
                      <Link
                        href={item.href}
                        className="font-medium text-success hover:underline"
                      >
                        {item.label}
                      </Link>
                      {item.sublabel ? (
                        <p className="text-app-xs text-muted-foreground">
                          {item.sublabel}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </AdminDataPanel>
            ))
          )}
        </div>
      ) : null}
    </AdminPageShell>
  );
}
