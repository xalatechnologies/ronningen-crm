"use client";

import { useTranslation } from "@/i18n/client";
import type { EnvChecklistItem } from "@/lib/admin/platform-integration-status";
import { cn } from "@/lib/utils";

export function EnvStatusBadge({
  isSet,
  className,
}: {
  isSet: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-md px-2 py-0.5 text-app-xs font-semibold",
        isSet
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-amber-500/10 text-amber-800 dark:text-amber-300",
        className,
      )}
    >
      {isSet ? t("admin.satt") : t("admin.mangler")}
    </span>
  );
}

export function EnvironmentVariableRow({ item }: { item: EnvChecklistItem }) {
  const { t } = useTranslation();
  const needsAttention = item.required && !item.isSet;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b border-rn-border-strong/40 px-4 py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        needsAttention && "border-l-2 border-l-amber-500 bg-amber-500/[0.04]",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <code className="break-all font-mono text-app-xs font-semibold text-foreground">
            {item.name}
          </code>
          {item.required ? (
            <span className="rounded-md border border-rn-border-strong/60 bg-muted/40 px-1.5 py-0.5 text-app-xs font-medium text-muted-foreground">
              Påkrevd
            </span>
          ) : (
            <span className="text-app-xs text-muted-foreground">{t("common.actions.optional")}</span>
          )}
        </div>
        <p className="mt-1 text-app-sm text-muted-foreground">
          {item.description}
        </p>
        <p className="mt-0.5 text-app-xs text-muted-foreground/80">
          {item.requiredFor}
        </p>
      </div>
      <EnvStatusBadge isSet={item.isSet} className="self-start sm:mt-0.5" />
    </div>
  );
}
