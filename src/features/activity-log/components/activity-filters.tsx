"use client";

import { useRouter } from "next/navigation";

import { FormSelect } from "@/components/ui/form-select";
import { Label } from "@/components/ui/label";
import { ACTIVITY_KINDS, activityHref, isActivityKind, type ActivityFilters } from "@/features/activity-log/lib/activity-query";
import { useTranslation } from "@/i18n/client";
import { AUDIT_TABLES, AUDIT_TABLE_LABEL_KEYS, isAuditTableName } from "@/lib/audit/describe-audit-entry";

const ALL = "all";

/** Two dropdowns (type of data, type of action). Changing one reloads the list from page 1. */
export function ActivityFilterBar({ table, kind }: ActivityFilters) {
  const { t } = useTranslation();
  const router = useRouter();

  const tableOptions = [
    { value: ALL, label: t("appPages.settings.activity.allTypes") },
    ...AUDIT_TABLES.map((name) => ({ value: name, label: t(AUDIT_TABLE_LABEL_KEYS[name]) })),
  ];
  const kindOptions = [
    { value: ALL, label: t("appPages.settings.activity.allKinds") },
    ...ACTIVITY_KINDS.map((k) => ({ value: k, label: t(`appPages.settings.activity.kinds.${k}`) })),
  ];

  return (
    <div role="group" aria-label={t("appPages.settings.activity.filterAria")} className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-48 flex-col gap-1.5">
        <Label htmlFor="activity-table" className="text-app-xs font-semibold text-muted-foreground">
          {t("appPages.settings.activity.filterType")}
        </Label>
        <FormSelect
          id="activity-table"
          value={table ?? ALL}
          onValueChange={(v) => router.push(activityHref({ page: 1, kind, table: isAuditTableName(v) ? v : null }))}
          options={tableOptions}
          className="h-10 min-h-10 w-full text-sm"
        />
      </div>
      <div className="flex min-w-44 flex-col gap-1.5">
        <Label htmlFor="activity-kind" className="text-app-xs font-semibold text-muted-foreground">
          {t("appPages.settings.activity.filterKind")}
        </Label>
        <FormSelect
          id="activity-kind"
          value={kind ?? ALL}
          onValueChange={(v) => router.push(activityHref({ page: 1, table, kind: isActivityKind(v) ? v : null }))}
          options={kindOptions}
          className="h-10 min-h-10 w-full text-sm"
        />
      </div>
    </div>
  );
}
