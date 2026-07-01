"use client";

import { useTranslation } from "@/i18n/client";
import { formatAuditActionLabel } from "@/lib/admin/audit-labels";
import type { AdminAuditEntry } from "@/lib/admin/queries/users-billing-audit";

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value, null, 2);
}

function MetadataDiff({
  before,
  after,
  t,
}: {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();

  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {keys.map((key) => (
        <div
          key={key}
          className="rounded-md border border-rn-border-strong/60 bg-muted/20 px-3 py-2"
        >
          <dt className="text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {key}
          </dt>
          <dd className="mt-1 space-y-1 text-app-sm">
            <p>
              <span className="text-muted-foreground">{t("adminLabels.fields.before")} </span>
              {formatValue(before[key])}
            </p>
            <p>
              <span className="text-muted-foreground">{t("adminLabels.fields.after")} </span>
              {formatValue(after[key])}
            </p>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AuditEntryDetailPanel({ entry }: { entry: AdminAuditEntry }) {
  const { t } = useTranslation();
  const before = entry.metadata.before;
  const after = entry.metadata.after;
  const hasDiff =
    before &&
    after &&
    typeof before === "object" &&
    typeof after === "object" &&
    !Array.isArray(before) &&
    !Array.isArray(after);

  return (
    <div className="space-y-4 py-2">
      <p className="font-mono text-app-xs text-muted-foreground">{entry.action}</p>
      <p className="text-app-sm text-muted-foreground">
        {formatAuditActionLabel(entry.action, t)}
      </p>

      {hasDiff ? (
        <MetadataDiff
          before={before as Record<string, unknown>}
          after={after as Record<string, unknown>}
          t={t}
        />
      ) : (
        <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 text-app-xs">
          {JSON.stringify(entry.metadata, null, 2)}
        </pre>
      )}
    </div>
  );
}
