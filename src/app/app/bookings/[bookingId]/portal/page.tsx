import { notFound, redirect } from "next/navigation";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { StaffMessageThread } from "@/components/portal/staff-message-thread";
import { getServerTranslation } from "@/i18n/server";
import { getCachedServerOrganizationContext } from "@/lib/organizations/cached-organization-context";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";
import { listThread } from "@/lib/portal/messages";
import { canManageBookings } from "@/lib/role-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BookingPortalPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
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

  const messages = await listThread(supabase, bookingId, {
    customerName,
    venueName: org?.name ?? t("portal.staffPage.venueName"),
  });

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
      {/* Tabs for wishlist and day plan arrive in slices 1b and 1c. */}
      <nav aria-label={t("portal.staffPage.title")} className="flex gap-2 border-b border-foreground/10">
        <span className="border-b-2 border-success px-3 py-2 text-app-sm font-semibold" aria-current="page">
          {t("portal.staffPage.tabMessages")}
        </span>
      </nav>
      {!accepted ? (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-app-sm">{t("portal.staffPage.notActive")}</p>
      ) : null}
      <StaffMessageThread bookingId={bookingId} messages={messages} />
    </div>
  );
}
