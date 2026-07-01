"use client";

import { useTranslation } from "@/i18n/client";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import {
  AdminSegmentFilterBar,
  AdminSegmentFilterControls,
  AdminSegmentFilterSearch,
  adminSegmentFilterButtonClass,
} from "@/components/admin/admin-segment-filter-bar";
import {
  EnvironmentVariableRow,
} from "@/components/admin/settings/environment-variable-row";
import type {
  EnvChecklistGroup,
  EnvChecklistItem,
} from "@/lib/admin/platform-integration-status";
import type { AdminSettingsOverview } from "@/lib/admin/queries/settings";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

const GROUP_ORDER: EnvChecklistGroup[] = [
  "core",
  "app",
  "billing",
  "email",
  "cron",
];

const ENV_GROUP_LABEL_KEYS = {
  core: "integrations.envGroups.core",
  app: "integrations.envGroups.app",
  billing: "integrations.envGroups.billing",
  email: "integrations.envGroups.email",
  cron: "integrations.envGroups.cron",
} as const satisfies Record<EnvChecklistGroup, string>;

type StatusFilter = "all" | "missing" | "required";

function matchesSearch(item: EnvChecklistItem, query: string): boolean {
  if (!query) return true;
  const haystack = `${item.name} ${item.description} ${item.requiredFor}`.toLowerCase();
  return haystack.includes(query);
}

function matchesStatusFilter(
  item: EnvChecklistItem,
  filter: StatusFilter,
): boolean {
  if (filter === "missing") return !item.isSet;
  if (filter === "required") return item.required;
  return true;
}

function GroupSection({
  group,
  label,
  items,
}: {
  group: EnvChecklistGroup;
  label: string;
  items: EnvChecklistItem[];
}) {
  const { t } = useTranslation();
  const setCount = items.filter((item) => item.isSet).length;
  const missingRequired = items.filter(
    (item) => item.required && !item.isSet,
  ).length;

  return (
    <section>
      <div className="flex items-center justify-between gap-3 border-b border-rn-border-strong/60 bg-muted/25 px-4 py-2.5">
        <h3 className="font-heading text-app-sm font-semibold">{label}</h3>
        <div className="flex items-center gap-2 text-app-xs text-muted-foreground">
          <span>
            {t("integrations.envChecklist.groupSetCount", {
              set: setCount,
              total: items.length,
            })}
          </span>
          {missingRequired > 0 ? (
            <span className="font-semibold text-amber-800 dark:text-amber-300">
              {t("integrations.envChecklist.groupMissingCount", {
                count: missingRequired,
              })}
            </span>
          ) : null}
        </div>
      </div>
      <div>
        {items.map((item) => (
          <EnvironmentVariableRow key={item.name} item={item} />
        ))}
      </div>
    </section>
  );
}

export function EnvironmentPanel({
  settings,
}: {
  settings: AdminSettingsOverview;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const statusFilters = useMemo(
    () => [
      { id: "all" as const, label: t("admin.alle") },
      { id: "missing" as const, label: t("admin.mangler") },
      { id: "required" as const, label: t("admin.pakrevde") },
    ],
    [t],
  );

  const normalizedSearch = search.trim().toLowerCase();

  const stats = useMemo(() => {
    const all = settings.envChecklist;
    const setCount = all.filter((item) => item.isSet).length;
    const missingRequired = all.filter(
      (item) => item.required && !item.isSet,
    );
    return {
      total: all.length,
      setCount,
      missingRequired,
    };
  }, [settings.envChecklist]);

  const filteredGroups = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      label: t(ENV_GROUP_LABEL_KEYS[group]),
      items: settings.envChecklist.filter(
        (item) =>
          item.group === group &&
          matchesSearch(item, normalizedSearch) &&
          matchesStatusFilter(item, statusFilter),
      ),
    })).filter((section) => section.items.length > 0);
  }, [normalizedSearch, settings.envChecklist, statusFilter, t]);

  const visibleCount = filteredGroups.reduce(
    (sum, section) => sum + section.items.length,
    0,
  );

  return (
    <div className="flex flex-col gap-[length:var(--spacing-app-gap)]">
      {stats.missingRequired.length > 0 ? (
        <div className="rounded-[length:var(--app-radius)] border border-amber-500/35 bg-amber-500/[0.06] px-4 py-3">
          <p className="text-app-sm font-semibold text-foreground">
            {stats.missingRequired.length === 1
              ? t("admin.overview_missing_env_one")
              : t("admin.overview_missing_env_many", {
                  count: stats.missingRequired.length,
                })}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {stats.missingRequired.map((item) => (
              <li key={item.name}>
                <code className="rounded-md border border-amber-500/30 bg-background/80 px-2 py-0.5 font-mono text-app-xs">
                  {item.name}
                </code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <AdminSegmentFilterBar aria-label={t("admin.filtrer_miljovariabler")}>
        <AdminSegmentFilterSearch
          value={search}
          onChange={setSearch}
          placeholder={t("admin.sok_variabel_eller_beskrivelse")}
          aria-label={t("admin.sok_miljovariabler")}
        />
        <AdminSegmentFilterControls aria-label={t("admin.statusfilter")}>
          {statusFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={adminSegmentFilterButtonClass(
                statusFilter === filter.id,
                "narrow",
              )}
            >
              {filter.label}
            </button>
          ))}
        </AdminSegmentFilterControls>
      </AdminSegmentFilterBar>

      <AdminDataPanel className="overflow-hidden p-0 sm:p-0 md:p-0">
        {filteredGroups.length > 0 ? (
          <div>
            {filteredGroups.map(({ group, label, items }) => (
              <GroupSection key={group} group={group} label={label} items={items} />
            ))}
          </div>
        ) : (
          <div className="px-4 py-12 text-center md:px-6">
            <p className="app-text-muted">{t("adminLabels.empty.noVariablesMatch")}</p>
            <button
              type="button"
              className="mt-3 text-app-sm font-semibold text-success hover:underline"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
            >
              {t("integrations.envChecklist.resetFilter")}
            </button>
          </div>
        )}
      </AdminDataPanel>

      <p
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1 text-app-xs text-muted-foreground",
        )}
      >
        <span>{t("integrations.envChecklist.securityHint")}</span>
        <span className="hidden sm:inline" aria-hidden>
          ·
        </span>
        <span>
          {t("integrations.envChecklist.visibleCount", {
            visible: visibleCount,
            total: stats.total,
          })}
        </span>
      </p>
    </div>
  );
}
