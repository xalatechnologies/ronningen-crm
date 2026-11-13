import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { getServerTranslation } from "@/i18n/server";
import type { TranslationKey } from "@/i18n/types";
import { getCachedServerOrganizationContext } from "@/lib/organizations/cached-organization-context";
import { isAdmin } from "@/lib/organizations/organization-permissions";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";
import { listPortalInbox } from "@/lib/portal/inbox";
import { filterInbox, INBOX_FILTERS, inboxCounts, parseInboxFilter, type InboxRow } from "@/lib/portal/inbox-rules";
import { canManageBookings } from "@/lib/role-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTER_LABEL: Record<(typeof INBOX_FILTERS)[number], TranslationKey> = {
  attention: "portal.inbox.filterAttention",
  active: "portal.inbox.filterActive",
  invited: "portal.inbox.filterInvited",
  all: "portal.inbox.filterAll",
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

export default async function PortalInboxPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { role } = await getCachedServerOrganizationContext();
  if (!canManageBookings(role)) redirect("/app/bookings");
  const { t, formatDate } = await getServerTranslation();
  const filter = parseInboxFilter((await searchParams).filter);

  const supabase = await createServerSupabaseClient();
  const orgId = await requireServerOrganizationId();
  const { data: org } = await supabase.from("organizations").select("portal_enabled" as "id").eq("id", orgId).maybeSingle();
  const enabled = Boolean((org as unknown as { portal_enabled?: boolean } | null)?.portal_enabled);

  const header = <AppPageHeader surface="card" compact className="mb-0" title={t("portal.inbox.title")} description={t("portal.inbox.lead")} />;

  if (!enabled) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <section className="flex flex-col items-start gap-3 rounded-2xl bg-card p-6 ring-1 ring-foreground/8">
          <h2 className="font-heading text-lg font-semibold">{t("portal.inbox.offTitle")}</h2>
          <p className="text-muted-foreground">{t("portal.inbox.offBody")}</p>
          {isAdmin(role) ? (
            <Link href="/app/settings/kontrakter" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-app-sm font-semibold !text-primary-foreground">
              {t("portal.inbox.offCta")}
            </Link>
          ) : null}
        </section>
      </div>
    );
  }

  const all = await listPortalInbox(supabase, orgId);
  const counts = inboxCounts(all);
  const rows = filterInbox(all, filter);

  return (
    <div className="flex flex-col gap-6">
      {header}
      <nav aria-label={t("portal.inbox.title")} className="flex flex-wrap gap-2">
        {INBOX_FILTERS.map((id) => (
          <Link
            key={id}
            href={id === "attention" ? "/app/portal" : `/app/portal?filter=${id}`}
            aria-current={filter === id ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-app-sm font-semibold ring-1 transition-colors",
              filter === id ? "bg-primary !text-primary-foreground ring-primary" : "bg-card text-foreground ring-foreground/12 hover:bg-muted/60",
            )}
          >
            {t(FILTER_LABEL[id])}
            <span className={cn("rounded-full px-2 py-0.5 text-app-xs tabular-nums", filter === id ? "bg-primary-foreground/20" : "bg-muted")}>{counts[id]}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-card px-6 py-10 text-center text-muted-foreground ring-1 ring-foreground/8">
          {all.length === 0 ? t("portal.inbox.emptyAll") : filter === "attention" ? t("portal.inbox.emptyAttention") : t("portal.inbox.emptyFiltered")}
        </p>
      ) : (
        <ul className="divide-y divide-foreground/8 overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8">
          {rows.map((row) => (
            <InboxItem key={row.bookingId} row={row} t={t} formatDate={formatDate} />
          ))}
        </ul>
      )}
    </div>
  );
}

function InboxItem({
  row,
  t,
  formatDate,
}: {
  row: InboxRow;
  t: Awaited<ReturnType<typeof getServerTranslation>>["t"];
  formatDate: (value: string) => string;
}) {
  const chips: { label: string; tone: "alert" | "quiet" }[] = [];
  if (row.unread > 0) chips.push({ label: t("portal.staffPage.unread", { count: row.unread }), tone: "alert" });
  if (row.wishesWaiting > 0) chips.push({ label: t("portal.staffWishes.pending", { count: row.wishesWaiting }), tone: "alert" });
  if (row.planWaiting) chips.push({ label: t("portal.staffSchedule.pendingBadge"), tone: "alert" });
  if (chips.length === 0) {
    chips.push({
      label: t(row.state === "active" ? "portal.inbox.stateActive" : row.state === "invited" ? "portal.inbox.stateInvited" : "portal.inbox.stateExpired"),
      tone: "quiet",
    });
  }
  const meta = [row.eventDate ? formatDate(row.eventDate) : t("portal.inbox.noDate"), row.eventType, row.reference].filter(Boolean).join(" · ");
  return (
    <li>
      <Link
        href={`/app/bookings/${row.bookingId}/portal${row.tab === "messages" ? "" : `?tab=${row.tab}`}`}
        className="flex min-h-20 items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50 active:bg-muted sm:px-5"
      >
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent font-heading font-semibold text-primary">
          {initials(row.customerName)}
        </span>
        <span className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.4fr)] sm:items-center sm:gap-6">
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{row.customerName}</span>
            <span className="truncate text-app-sm text-muted-foreground sm:hidden">{meta}</span>
            <span className="hidden truncate text-app-sm text-muted-foreground sm:block">{row.reference}</span>
          </span>
          <span className="hidden min-w-0 flex-col sm:flex">
            <span className="truncate text-app-sm font-medium">{row.eventDate ? formatDate(row.eventDate) : t("portal.inbox.noDate")}</span>
            <span className="truncate text-app-sm text-muted-foreground">{row.eventType}</span>
          </span>
          <span className="flex flex-wrap gap-1.5 sm:justify-end">
            {chips.map((chip) => (
              <span
                key={chip.label}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-app-xs font-semibold",
                  chip.tone === "alert" ? "bg-success text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {chip.label}
              </span>
            ))}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}
