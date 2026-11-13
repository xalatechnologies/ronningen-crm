import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { StaffMessageThread } from "@/components/portal/staff-message-thread";
import { StaffGuests } from "@/components/portal/staff-guests";
import { StaffSchedule } from "@/components/portal/staff-schedule";
import { StaffWishlist } from "@/components/portal/staff-wishlist";
import { getServerTranslation } from "@/i18n/server";
import { getCachedServerOrganizationContext } from "@/lib/organizations/cached-organization-context";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";
import { listThread } from "@/lib/portal/messages";
import { getGuestSummary } from "@/lib/portal/guests";
import { listScheduleVersions } from "@/lib/portal/schedule";
import { portalInviteState } from "@/lib/portal/rules";
import { listWishItems } from "@/lib/portal/wishlist";
import { awaitingVenue } from "@/lib/portal/wishlist-rules";
import { canManageBookings } from "@/lib/role-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BookingPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { bookingId } = await params;
  const { tab } = await searchParams;
  const activeTab = tab === "wishes" ? "wishes" : tab === "schedule" ? "schedule" : tab === "guests" ? "guests" : "messages";
  const supabase = await createServerSupabaseClient();
  const orgId = await requireServerOrganizationId();
  const { role } = await getCachedServerOrganizationContext();
  if (!canManageBookings(role)) redirect("/app/bookings");
  const { t, formatDate } = await getServerTranslation();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, booking_reference, customer_id, event_date, event_type, fest_type")
    .eq("id", bookingId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!booking) notFound();

  const [{ data: customer }, { data: org }, { data: account }, { count: unreadCount }] = await Promise.all([
    supabase.from("customers").select("name").eq("id", booking.customer_id).maybeSingle(),
    supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
    supabase
      .from("portal_accounts" as never)
      .select("accepted_at, expires_at, revoked_at")
      .eq("booking_id", bookingId)
      .is("revoked_at", null)
      .maybeSingle(),
    supabase
      .from("portal_messages" as never)
      .select("id", { count: "exact", head: true })
      .eq("booking_id", bookingId)
      .eq("sender_kind", "customer")
      .is("read_by_staff_at", null),
  ]);
  const customerName = customer?.name ?? "";
  const accountRow = account as { accepted_at: string | null; expires_at: string; revoked_at: string | null } | null;
  const accepted = Boolean(accountRow?.accepted_at);
  const state = accountRow ? portalInviteState(accountRow) : null;
  const meta = [booking.fest_type || booking.event_type, booking.event_date ? formatDate(booking.event_date) : null, booking.booking_reference].filter(Boolean).join(" · ");

  const [messages, wishItems, scheduleVersions, guestSummary] = await Promise.all([
    activeTab === "messages"
      ? listThread(supabase, bookingId, { customerName, venueName: org?.name ?? t("portal.staffPage.venueName") })
      : Promise.resolve([]),
    listWishItems(supabase, bookingId),
    listScheduleVersions(supabase, bookingId),
    activeTab === "guests" ? getGuestSummary(supabase, bookingId) : Promise.resolve(null),
  ]);
  const waiting = awaitingVenue(wishItems);
  const scheduleWaiting = scheduleVersions[0] && !scheduleVersions[0].acknowledgedAt ? 1 : 0;

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        surface="card"
        compact
        className="mb-0"
        title={customerName || t("portal.staffPage.title")}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>{meta}</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-app-xs font-semibold",
                state === "accepted" ? "bg-success/15 text-success" : "bg-amber-500/15 text-amber-800 dark:text-amber-300",
              )}
            >
              {t(state === "accepted" ? "portal.inbox.stateActive" : state === "expired" ? "portal.inbox.stateExpired" : "portal.inbox.stateInvited")}
            </span>
          </span>
        }
        backLink={{ href: "/app/portal", label: t("portal.staffPage.back") }}
        actions={
          <Link
            href={`/app/bookings/${bookingId}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-foreground/20 bg-card px-4 text-app-sm font-semibold transition-colors hover:bg-muted/60"
          >
            {t("portal.staffPage.openBooking")}
            <ExternalLink className="size-4" aria-hidden />
          </Link>
        }
      />
      <nav aria-label={t("portal.staffPage.title")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(
          [
            { id: "messages", href: `/app/bookings/${bookingId}/portal`, label: t("portal.staffPage.tabMessages"), badge: unreadCount ?? 0 },
            { id: "wishes", href: `/app/bookings/${bookingId}/portal?tab=wishes`, label: t("portal.staffWishes.tab"), badge: waiting },
            { id: "guests", href: `/app/bookings/${bookingId}/portal?tab=guests`, label: t("portal.staffGuests.tab"), badge: 0 },
            { id: "schedule", href: `/app/bookings/${bookingId}/portal?tab=schedule`, label: t("portal.staffSchedule.tab"), badge: scheduleWaiting },
          ] as const
        ).map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={activeTab === item.id ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-app-sm font-semibold ring-1 transition-colors",
              activeTab === item.id ? "bg-primary !text-primary-foreground ring-primary" : "bg-card text-foreground ring-foreground/12 hover:bg-muted/60",
            )}
          >
            {item.label}
            {item.badge > 0 ? (
              <span className={cn("rounded-full px-2 py-0.5 text-app-xs tabular-nums", activeTab === item.id ? "bg-primary-foreground/20" : "bg-success text-white")}>{item.badge}</span>
            ) : null}
          </Link>
        ))}
      </nav>
      {!accepted ? (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-app-sm">{t("portal.staffPage.notActive")}</p>
      ) : null}
      {activeTab === "wishes" ? (
        <StaffWishlist bookingId={bookingId} items={wishItems} />
      ) : activeTab === "guests" ? (
        <StaffGuests summary={guestSummary} />
      ) : activeTab === "schedule" ? (
        <StaffSchedule bookingId={bookingId} versions={scheduleVersions} />
      ) : (
        <StaffMessageThread bookingId={bookingId} messages={messages} />
      )}
    </div>
  );
}
