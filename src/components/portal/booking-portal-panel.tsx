"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";
import { sendPortalInvite } from "@/lib/portal/actions";
import { portalInviteState, type PortalInviteState } from "@/lib/portal/rules";
import { useSupabase } from "@/providers/supabase-provider";

type AccountRow = {
  email: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

/** Venue side of the customer portal for one booking: invitation status and (re)send. */
export function BookingPortalPanel(props: { organizationId: string; bookingId: string }) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [account, setAccount] = useState<AccountRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: org }, { data: rows }] = await Promise.all([
      supabase.from("organizations").select("portal_enabled" as "id").eq("id", props.organizationId).maybeSingle(),
      supabase
        .from("portal_accounts" as never)
        .select("email, expires_at, accepted_at, revoked_at")
        .eq("booking_id", props.bookingId)
        .eq("organization_id", props.organizationId)
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    setEnabled(Boolean((org as unknown as { portal_enabled?: boolean } | null)?.portal_enabled));
    setAccount(((rows as unknown as AccountRow[] | null) ?? [])[0] ?? null);
  }, [props.bookingId, props.organizationId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!enabled) return null;

  const state: PortalInviteState | null = account ? portalInviteState(account) : null;
  const message = !account
    ? t("portal.staff.notInvited")
    : state === "accepted"
      ? t("portal.staff.active", { email: account.email })
      : state === "expired"
        ? t("portal.staff.expired", { email: account.email })
        : t("portal.staff.pending", { email: account.email });

  async function send() {
    setBusy(true);
    try {
      const result = await sendPortalInvite(props.bookingId);
      if (!result.ok) {
        toast.error(result.error === "no_email" ? t("portal.staff.noEmail") : t("portal.staff.failed"));
        return;
      }
      toast.success(t("portal.staff.sent"));
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/8">
      <h3 className="font-heading text-base font-semibold">{t("portal.staff.title")}</h3>
      <p className="text-app-sm text-muted-foreground">{message}</p>
      {state !== "accepted" ? (
        <Button type="button" variant="outline" size="sm" className="w-fit" disabled={busy} onClick={() => void send()}>
          {account ? t("portal.staff.resend") : t("portal.staff.invite")}
        </Button>
      ) : null}
    </section>
  );
}
