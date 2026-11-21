"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";
import { sendPortalInvite } from "@/lib/portal/actions";
import type { PortalInviteState } from "@/lib/portal/rules";

const labelClass = "text-app-xs font-semibold leading-tight text-muted-foreground";

/** Customer portal status for one booking row, with a quick invite button. Hidden when the portal is off. */
export function BookingListPortalAction({
  bookingId,
  customer,
  state,
  cancelled,
}: {
  bookingId: string;
  customer: string;
  state: PortalInviteState | "none" | undefined;
  cancelled: boolean;
}) {
  const { t } = useTranslation();
  const [sentNow, setSentNow] = useState(false);
  const [busy, setBusy] = useState(false);

  if (state === undefined || cancelled) return null;
  const current = sentNow ? "pending" : state;

  if (current === "accepted") return <span className={labelClass}>{t("portal.staff.listActive")}</span>;

  async function send() {
    setBusy(true);
    try {
      const result = await sendPortalInvite(bookingId);
      if (!result.ok) {
        toast.error(
          result.error === "no_email"
            ? t("portal.staff.noEmail")
            : result.error === "booking_cancelled"
              ? t("portal.staff.cancelled")
              : t("portal.staff.failed"),
        );
        return;
      }
      toast.success(t("portal.staff.sent"));
      setSentNow(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {current === "pending" ? <span className={labelClass}>{t("portal.staff.listPending")}</span> : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        aria-label={t("portal.staff.listSentAria", { customer })}
        onClick={(event) => {
          event.stopPropagation();
          void send();
        }}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {current === "none" || current === "revoked" ? t("portal.staff.listInvite") : t("portal.staff.resend")}
      </Button>
    </div>
  );
}
