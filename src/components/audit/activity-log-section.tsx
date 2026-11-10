import Link from "next/link";

import { AuditEntryDetails } from "@/components/audit/audit-entry-details";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getServerTranslation } from "@/i18n/server";
import {
  AUDIT_TABLES,
  AUDIT_TABLE_LABEL_KEYS,
  describeAuditEntry,
  type AuditEntryInput,
  type AuditTableName,
} from "@/lib/audit/describe-audit-entry";
import { formatAuditTimestamp } from "@/lib/audit/format-audit-time";
import { RN_ADMIN_SEGMENT_ACTIVE, RN_CARD_SHELL } from "@/lib/rn-ui";
import { APP_DATA_PRIMARY } from "@/lib/table-typography";
import { cn } from "@/lib/utils";

export type ActivityLogRow = {
  id: number;
  createdAtIso: string;
  actorName: string | null;
  rowId: string;
  entry: AuditEntryInput;
};

type Props = {
  rows: ActivityLogRow[];
  page: number;
  totalPages: number;
  tableFilter: AuditTableName | null;
};

function hrefFor(page: number, tableFilter: AuditTableName | null): string {
  const params = new URLSearchParams();
  if (tableFilter) params.set("table", tableFilter);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/app/settings/activity?${qs}` : "/app/settings/activity";
}

const LINK_BASE =
  "inline-flex min-h-[var(--app-tap-target-min)] items-center rounded-md border-2 px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50";
const LINK_IDLE =
  "border-rn-border-strong/60 text-muted-foreground hover:bg-rn-surface-row-hover hover:text-foreground";

export async function ActivityLogSection({
  rows,
  page,
  totalPages,
  tableFilter,
}: Props) {
  const { t, locale, dictionary } = await getServerTranslation();
  const fieldLabels: Record<string, string> =
    dictionary.appPages.settings.activity.fields;

  const items = rows.map((row) => {
    const description = describeAuditEntry(row.entry, locale);
    const tableLabel = description.table
      ? t(AUDIT_TABLE_LABEL_KEYS[description.table])
      : row.entry.table_name;
    return {
      row,
      description,
      tableLabel,
      kindLabel: t(`appPages.settings.activity.kinds.${description.kind}`),
      time: formatAuditTimestamp(row.createdAtIso, locale),
      who: row.actorName ?? t("appPages.settings.activity.system"),
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <nav
        aria-label={t("appPages.settings.activity.filterAria")}
        className="flex flex-wrap gap-2"
      >
        {[null, ...AUDIT_TABLES].map((name) => {
          const active = name === tableFilter;
          return (
            <Link
              key={name ?? "all"}
              href={hrefFor(1, name)}
              aria-current={active ? "true" : undefined}
              className={cn(LINK_BASE, active ? RN_ADMIN_SEGMENT_ACTIVE : LINK_IDLE)}
            >
              {name
                ? t(AUDIT_TABLE_LABEL_KEYS[name])
                : t("appPages.settings.activity.filterAll")}
            </Link>
          );
        })}
      </nav>

      {items.length === 0 ? (
        <div className={cn("flex flex-col gap-1 p-6 md:p-8", RN_CARD_SHELL)}>
          <h2 className="font-heading text-lg font-bold">
            {t("appPages.settings.activity.empty")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("appPages.settings.activity.emptyHint")}
          </p>
        </div>
      ) : (
        <>
          <div className={cn("hidden min-w-0 overflow-hidden md:block", RN_CARD_SHELL)}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("appPages.settings.activity.columns.time")}</TableHead>
                  <TableHead>{t("appPages.settings.activity.columns.who")}</TableHead>
                  <TableHead>{t("appPages.settings.activity.columns.what")}</TableHead>
                  <TableHead>{t("appPages.settings.activity.columns.details")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(({ row, description, tableLabel, kindLabel, time, who }) => (
                  <TableRow key={row.id} className="align-top">
                    <TableCell className="align-top tabular-nums">{time}</TableCell>
                    <TableCell className={cn("align-top", APP_DATA_PRIMARY)}>
                      {who}
                    </TableCell>
                    <TableCell className="align-top">
                      {kindLabel} · {tableLabel}
                    </TableCell>
                    <TableCell className="max-w-md align-top whitespace-normal">
                      <AuditEntryDetails
                        description={description}
                        fieldLabels={fieldLabels}
                        rowId={row.rowId}
                        t={t}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {items.map(({ row, description, tableLabel, kindLabel, time, who }) => (
              <li
                key={row.id}
                className={cn("flex min-w-0 flex-col gap-2 p-4", RN_CARD_SHELL)}
              >
                <p className="text-app-sm font-semibold tabular-nums text-muted-foreground">
                  {time}
                </p>
                <p className="text-app-base font-semibold text-foreground">
                  {kindLabel} · {tableLabel}
                </p>
                <p className="text-app-sm text-muted-foreground">{who}</p>
                <AuditEntryDetails
                  description={description}
                  fieldLabels={fieldLabels}
                  rowId={row.rowId}
                  t={t}
                />
              </li>
            ))}
          </ul>

          <nav
            aria-label={t("appPages.settings.activity.paginationAria")}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            {page > 1 ? (
              <Link
                href={hrefFor(page - 1, tableFilter)}
                rel="prev"
                className={cn(LINK_BASE, LINK_IDLE)}
              >
                {t("appPages.settings.activity.previous")}
              </Link>
            ) : (
              <span aria-hidden />
            )}
            <span className="text-sm text-muted-foreground">
              {t("appPages.settings.activity.pageOf", { page, total: totalPages })}
            </span>
            {page < totalPages ? (
              <Link
                href={hrefFor(page + 1, tableFilter)}
                rel="next"
                className={cn(LINK_BASE, LINK_IDLE)}
              >
                {t("appPages.settings.activity.next")}
              </Link>
            ) : (
              <span aria-hidden />
            )}
          </nav>
        </>
      )}
    </div>
  );
}
