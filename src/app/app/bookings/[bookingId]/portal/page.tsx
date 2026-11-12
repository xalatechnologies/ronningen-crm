import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { StaffMessageThread } from "@/components/portal/staff-message-thread";
import { StaffSchedule } from "@/components/portal/staff-schedule";
import { StaffWishlist } from "@/components/portal/staff-wishlist";
import { getServerTranslation } from "@/i18n/server";
import { getCachedServerOrganizationContext } from "@/lib/organizations/cached-organization-context";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";
import { listThread } from "@/lib/portal/messages";
import { listScheduleVersions } from "@/lib/portal/schedule";
import { listWishItems } from "@/lib/portal/wishlist";
import { awaitingVenue } from "@/lib/portal/wishlist-rules";
import { canManageBookings } from "@/lib/role-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  const activeTab = tab === "wishes" ? "wishes" : tab === "schedule" ? "schedule" : "messages";
  const supabase = await createServerSupabaseClient();
  const orgId = await requireServerOrganizationId();
  const { role } = await getCachedServerOrganizationContext();
  if (!canManageBookings(role)) redirect("/app/bookings");
  const { t } = await getServerTranslation();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, booking_reference, customer_id")
    .eq("id", bookingId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!booking) notFound();

  const [{ data: customer }, { data: org }, { data: account }] = await Promise.all([
    supabase.from("customers").select("name").eq("id", booking.customer_id).maybeSingle(),
    supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
    supabase
      .from("portal_accounts" as never)
      .select("accepted_at")
      .eq("booking_id", bookingId)
      .is("revoked_at", null)
      .maybeSingle(),
  ]);
  const customerName = customer?.name ?? "";
  const accepted = Boolean((account as { accepted_at: string | null } | null)?.accepted_at);

  const [messages, wishItems, scheduleVersions] = await Promise.all([
    activeTab === "messages"
      ? listThread(supabase, bookingId, { customerName, venueName: org?.name ?? t("portal.staffPage.venueName") })
      : Promise.resolve([]),
    listWishItems(supabase, bookingId),
    listScheduleVersions(supabase, bookingId),
  ]);
  const waiting = awaitingVenue(wishItems);
  const scheduleWaiting = scheduleVersions[0] && !scheduleVersions[0].acknowledgedAt ? 1 : 0;

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        surface="card"
        compact
        className="mb-0"
        title={t("portal.staffPage.title")}
        description={t("portal.staffPage.customer", { name: customerName })}
        backLink={{ href: "/app/bookings", label: t("portal.staffPage.back") }}
      />
      <nav aria-label={t("portal.staffPage.title")} className="flex gap-2 border-b border-foreground/10">
        {(
          [
            { id: "messages", href: `/app/bookings/${bookingId}/portal`, label: t("portal.staffPage.tabMessages"), badge: 0 },
            { id: "wishes", href: `/app/bookings/${bookingId}/portal?tab=wishes`, label: t("portal.staffWishes.tab"), badge: waiting },
            { id: "schedule", href: `/app/bookings/${bookingId}/portal?tab=schedule`, label: t("portal.staffSchedule.tab"), badge: scheduleWaiting },
          ] as const
        ).map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={activeTab === item.id ? "page" : undefined}
            className={`flex min-h-11 items-center gap-2 border-b-2 px-3 text-app-sm font-semibold ${
              activeTab === item.id ? "border-success" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
            {item.badge > 0 ? <span className="rounded-full bg-success px-2 py-0.5 text-app-xs text-white">{item.badge}</span> : null}
          </Link>
        ))}
      </nav>
      {!accepted ? (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-app-sm">{t("portal.staffPage.notActive")}</p>
      ) : null}
      {activeTab === "wishes" ? (
        <StaffWishlist bookingId={bookingId} items={wishItems} />
      ) : activeTab === "schedule" ? (
        <StaffSchedule bookingId={bookingId} versions={scheduleVersions} />
      ) : (
        <StaffMessageThread bookingId={bookingId} messages={messages} />
      )}
    </div>
  );
}
