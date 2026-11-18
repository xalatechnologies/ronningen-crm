"use client";

import { MessageSquareText, Send } from "lucide-react";
import { useState } from "react";

import { GuestMessageSheet, type MessagingState } from "@/components/portal/guest-message-sheet";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";
import type { GuestRow } from "@/lib/portal/guest-rules";

/**
 * The two ways to write from the Meldinger page: to the venue (the conversation below, always the selected
 * one: this focuses its input) or to the guests (opens the guest message sheet, only when the customer may e-mail guests).
 */
export function MessageTargets({ guests, messaging, canMessageGuests }: { guests: GuestRow[]; messaging: MessagingState; canMessageGuests: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  function toVenue() {
    const input = document.querySelector<HTMLTextAreaElement>(`textarea[aria-label="${t("portal.messages.placeholder")}"]`);
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus({ preventScroll: true });
  }

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="success" size="cta" aria-pressed="true" className="w-full rounded-full" onClick={toVenue}>
          <Send className="size-5" aria-hidden />
          {t("portal.messages.toVenue")}
        </Button>
        {canMessageGuests ? (
          <Button type="button" variant="outline" size="cta" className="w-full rounded-full border-gold/60" onClick={() => setOpen(true)}>
            <MessageSquareText className="size-5" aria-hidden />
            {t("portal.guestMessage.open")}
          </Button>
        ) : null}
      </div>
      {canMessageGuests ? <GuestMessageSheet open={open} onOpenChange={setOpen} guests={guests} messaging={messaging} /> : null}
    </>
  );
}
