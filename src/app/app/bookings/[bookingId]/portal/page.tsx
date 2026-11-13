import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Mail, Phone, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

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
import { approvedTotalNok, awaitingVenue } from "@/lib/portal/wishlist-rules";
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
  const { t, formatDate, locale } = await getServerTranslation();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, booking_reference, customer_id, event_date, event_type, fest_type, guest_count")
    .eq("id", bookingId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!booking) notFound();

  const [{ data: customer }, { data: org }, { data: account }, { count: unreadCount }] = await Promise.all([
    supabase.from("customers").select("name, email, phone").eq("id", booking.customer_id).maybeSingle(),
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
    getGuestSummary(supabase, bookingId),
  ]);
  const waiting = awaitingVenue(wishItems);
  const scheduleWaiting = scheduleVersions[0] && !scheduleVersions[0].acknowledgedAt ? 1 : 0;
  const approved = approvedTotalNok(wishItems.filter((i) => i.status !== "draft"));
  const nok = new Intl.NumberFormat(locale, { style: "currency", currency: "NOK", maximumFractionDigits: 2 }).format(approved);
  const initials = (customerName || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("");
  const tabHref = (id: string) => (id === "messages" ? `/app/bookings/${bookingId}/portal` : `/app/bookings/${bookingId}/portal?tab=${id}`);
  const unread = unreadCount ?? 0;
  const todo = [
    { id: "messages", label: t("portal.staffPage.unread", { count: unread }), on: unread > 0 },
    { id: "wishes", label: t("portal.staffWishes.pending", { count: waiting }), on: waiting > 0 },
    { id: "schedule", label: t("portal.staffSchedule.pendingBadge"), on: scheduleWaiting > 0 },
  ].filter((x) => x.on);

  const statusChip = (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-app-xs font-semibold",
        state === "accepted" ? "bg-success/15 text-success" : "bg-amber-500/15 text-amber-800 dark:text-amber-300",
      )}
    >
      {t(state === "accepted" ? "portal.inbox.stateActive" : state === "expired" ? "portal.inbox.stateExpired" : "portal.inbox.stateInvited")}
    </span>
  );
  const card = "rounded-2xl bg-card p-5 ring-1 ring-foreground/8";

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl bg-card p-5 ring-1 ring-foreground/8 sm:p-6">
        <Link
          href="/app/portal"
          className="mb-5 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-xl border border-foreground/20 bg-card pl-2 pr-4 text-app-sm font-semibold transition-colors hover:bg-muted/60"
        >
          <ChevronLeft className="size-5" aria-hidden />
          {t("portal.staffPage.back")}
        </Link>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary font-heading text-xl font-bold !text-primary-foreground sm:size-20 sm:text-2xl">
              {initials}
            </span>
            <div className="flex min-w-0 flex-col gap-2">
              <h1 className="app-title break-words">{customerName || t("portal.staffPage.title")}</h1>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-app-base text-muted-foreground">
                <span>{meta}</span>
                {statusChip}
              </p>
            </div>
          </div>
          <Link
            href={`/app/bookings/${bookingId}`}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-foreground/20 bg-card px-5 text-app-base font-semibold transition-colors hover:bg-muted/60"
          >
            {t("portal.staffPage.openBooking")}
            <ExternalLink className="size-4" aria-hidden />
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <nav aria-label={t("portal.staffPage.title")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(
              [
                { id: "messages", label: t("portal.staffPage.tabMessages"), badge: unread },
                { id: "wishes", label: t("portal.staffWishes.tab"), badge: waiting },
                { id: "guests", label: t("portal.staffGuests.tab"), badge: 0 },
                { id: "schedule", label: t("portal.staffSchedule.tab"), badge: scheduleWaiting },
              ] as const
            ).map((item) => (
              <Link
                key={item.id}
                href={tabHref(item.id)}
                aria-current={activeTab === item.id ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full px-6 text-app-base font-semibold ring-1 transition-colors",
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
          {!accepted ? <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-app-sm">{t("portal.staffPage.notActive")}</p> : null}
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

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <section className={card}>
            <h2 className="font-heading text-lg font-semibold">{t("portal.staffPage.sideWaiting")}</h2>
            {todo.length === 0 ? (
              <p className="mt-2 text-app-base text-muted-foreground">{t("portal.staffPage.sideAllDone")}</p>
            ) : (
              <ul className="-mx-2 mt-2 flex flex-col">
                {todo.map((item) => (
                  <li key={item.id}>
                    <Link href={tabHref(item.id)} className="flex min-h-12 items-center justify-between gap-3 rounded-xl px-2 text-app-base font-medium transition-colors hover:bg-muted/60">
                      <span className="flex items-center gap-3">
                        <span className="size-2.5 rounded-full bg-success" aria-hidden />
                        {item.label}
                      </span>
                      <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={card}>
            <h2 className="font-heading text-lg font-semibold">{t("portal.staffPage.sideCustomer")}</h2>
            <ul className="mt-3 flex flex-col gap-3 text-app-base">
              {customer?.email ? (
                <li className="flex items-center gap-3">
                  <Mail className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  <a href={`mailto:${customer.email}`} className="min-w-0 truncate hover:underline">
                    {customer.email}
                  </a>
                </li>
              ) : null}
              {customer?.phone ? (
                <li className="flex items-center gap-3">
                  <Phone className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  <a href={`tel:${customer.phone}`} className="hover:underline">
                    {customer.phone}
                  </a>
                </li>
              ) : null}
              {booking.event_date ? (
                <li className="flex items-center gap-3">
                  <CalendarDays className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  {formatDate(booking.event_date)}
                </li>
              ) : null}
              {booking.guest_count ? (
                <li className="flex items-center gap-3">
                  <Users className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  {t("portal.staffPage.sideExpected", { count: booking.guest_count })}
                </li>
              ) : null}
            </ul>
          </section>

          <section className={card}>
            <h2 className="font-heading text-lg font-semibold">{t("portal.staffPage.sideEvent")}</h2>
            <ul className="mt-3 flex flex-col gap-3 text-app-base">
              <li className="flex items-center gap-3">
                <Users className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                {guestSummary && guestSummary.total > 0
                  ? t("portal.staffPage.sideGuestsAnswered", { answered: guestSummary.invited - guestSummary.noAnswer, total: guestSummary.total })
                  : t("portal.staffPage.sideNoGuests")}
              </li>
              <li className="flex items-center gap-3">
                <Wallet className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                {t("portal.staffPage.sideExtras")}: <span className="font-semibold tabular-nums">{nok}</span>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
