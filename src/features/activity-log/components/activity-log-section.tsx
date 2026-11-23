import { Cog } from "lucide-react";
import Link from "next/link";

import { AuditEntryDetails } from "@/components/audit/audit-entry-details";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import type { UserRole } from "@/constants/roles";
import { ActivityFilterBar } from "@/features/activity-log/components/activity-filters";
import { ACTIVITY_PAGE_SIZE, activityHref, entryRange, type ActivityFilters } from "@/features/activity-log/lib/activity-query";
import { groupByDay } from "@/features/activity-log/lib/group-by-day";
import { getServerTranslation } from "@/i18n/server";
import {
  describeAuditEntry,
  type AuditDescription,
  type AuditEntryInput,
} from "@/lib/audit/describe-audit-entry";
import { formatAuditClock, formatAuditDay, formatAuditTimestamp } from "@/lib/audit/format-audit-time";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { roleLabel } from "@/lib/navigation/nav-labels";
import { cn } from "@/lib/utils";

export type ActivityLogRow = {
  id: number;
  createdAtIso: string;
  /** Who did it; null for the system (a database job, not a person). */
  actor: { name: string; email: string | null; role: UserRole | null } | null;
  rowId: string;
  entry: AuditEntryInput;
  /** Name or reference of the thing that was touched, when it has one. */
  subject: string | null;
  /** The booking this row hangs under (payment installments). */
  booking: { id: string; reference: string | null } | null;
};

type Props = ActivityFilters & {
  rows: ActivityLogRow[];
  page: number;
  totalPages: number;
  total: number;
  /** The moment "today" is measured from. */
  now: Date;
};

const KIND_TONE: Record<AuditDescription["kind"], StatusTone> = {
  created: "success",
  changed: "info",
  deleted: "danger",
};

const PAGER_LINK =
  "inline-flex min-h-[var(--app-tap-target-min)] items-center rounded-xl border border-foreground/20 px-3 text-sm font-semibold text-muted-foreground outline-none transition-colors hover:bg-rn-surface-row-hover hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50";

/** Audit trail grouped by day: who did what, to which kind of data, at what time, with the details beneath. */
export async function ActivityLogSection({ rows, page, totalPages, total, table, kind, now }: Props) {
  const { t, locale, dictionary } = await getServerTranslation();
  const fieldLabels: Record<string, string> = dictionary.appPages.settings.activity.fields;
  const filtered = table != null || kind != null;
  const { from, to } = entryRange(page, ACTIVITY_PAGE_SIZE, total);
  const groups = groupByDay(rows, now);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <ActivityFilterBar table={table} kind={kind} />
        {filtered ? (
          <Link
            href={activityHref({ page: 1, table: null, kind: null })}
            className="rounded-sm text-app-sm font-semibold text-success underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 dark:!text-white"
          >
            {t("appPages.settings.activity.resetFilters")}
          </Link>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <div className={cn("flex flex-col gap-1 p-6 md:p-8", RN_CARD_SHELL)}>
          <h2 className="font-heading text-lg font-bold">
            {filtered ? t("appPages.settings.activity.noMatches") : t("appPages.settings.activity.empty")}
          </h2>
          <p className="text-app-sm text-muted-foreground">
            {filtered ? t("appPages.settings.activity.noMatchesHint") : t("appPages.settings.activity.emptyHint")}
          </p>
        </div>
      ) : (
        <>
          {groups.map((group) => (
            <section key={group.dayKey} aria-labelledby={`day-${group.dayKey}`} className="flex flex-col gap-2">
              <h2 id={`day-${group.dayKey}`} className="px-1 text-app-sm font-semibold text-muted-foreground">
                {group.label === "date"
                  ? formatAuditDay(group.isoOfFirst, locale)
                  : t(group.label === "today" ? "appPages.settings.activity.today" : "appPages.settings.activity.yesterday")}
              </h2>
              <ul className={cn(RN_CARD_SHELL, "divide-y divide-foreground/10 overflow-hidden")}>
                {group.items.map((row) => {
                  const description = describeAuditEntry(row.entry, locale);
                                    const who = row.actor?.name ?? t("appPages.settings.activity.system");
                  const object = description.table
                    ? t(`appPages.settings.activity.objects.${description.table}`)
                    : row.entry.table_name;
                  const meta = [row.actor?.email, row.actor?.role ? roleLabel(row.actor.role, t) : null].filter(Boolean).join(" · ");
                  return (
                    <li key={row.id} className="flex items-start gap-3.5 px-5 py-4 md:px-6">
                      {row.actor ? (
                        <InitialsAvatar name={row.actor.name} />
                      ) : (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden>
                          <Cog className="size-4" />
                        </span>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-foreground">
                          <span className="font-semibold">{who}</span>
                          <span>{t(`appPages.settings.activity.verbs.${description.kind}`)}</span>
                          <span>{object}</span>
                          {row.subject ? <span className="font-semibold">«{row.subject}»</span> : null}
                          <StatusBadge tone={KIND_TONE[description.kind]} dot={false} className="ml-1">
                            {t(`appPages.settings.activity.kinds.${description.kind}`)}
                          </StatusBadge>
                        </p>
                        {meta ? <p className="text-app-xs text-muted-foreground">{meta}</p> : null}
                        {row.booking ? (
                          <p className="text-app-sm text-muted-foreground">
                            {row.booking.reference
                              ? t("appPages.settings.activity.onBooking", { reference: row.booking.reference })
                              : t("appPages.settings.activity.onBookingUnknown")}{" "}
                            ·{" "}
                            <Link
                              href={`/app/bookings/${encodeURIComponent(row.booking.id)}`}
                              className="rounded-sm font-semibold text-success underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 dark:!text-white"
                            >
                              {t("appPages.settings.activity.openBooking")}
                            </Link>
                          </p>
                        ) : null}
                        <AuditEntryDetails description={description} fieldLabels={fieldLabels} rowId={row.rowId} t={t} subject={row.subject} />
                      </div>
                      <time
                        dateTime={row.createdAtIso}
                        title={formatAuditTimestamp(row.createdAtIso, locale)}
                        className="shrink-0 pt-0.5 text-app-sm tabular-nums text-muted-foreground"
                      >
                        {formatAuditClock(row.createdAtIso, locale)}
                      </time>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <nav aria-label={t("appPages.settings.activity.paginationAria")} className="flex flex-wrap items-center justify-between gap-3">
            {page > 1 ? (
              <Link href={activityHref({ page: page - 1, table, kind })} rel="prev" className={PAGER_LINK}>
                {t("appPages.settings.activity.previous")}
              </Link>
            ) : (
              <span aria-hidden />
            )}
            <span className="text-app-sm text-muted-foreground">
              {t("appPages.settings.activity.showingRange", { from, to, total })} ·{" "}
              {t("appPages.settings.activity.pageOf", { page, total: totalPages })}
            </span>
            {page < totalPages ? (
              <Link href={activityHref({ page: page + 1, table, kind })} rel="next" className={PAGER_LINK}>
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
