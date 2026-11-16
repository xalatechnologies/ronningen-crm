import { ChevronRight, Mail } from "lucide-react";
import Link from "next/link";

import { BotanicalSprig } from "@/components/brand/botanical";
import { getServerTranslation } from "@/i18n/server";

/** Entry to the invitation designer from the guest list, with the design's current state. */
export async function InviteLinkCard({ status }: { status: "none" | "draft" | "published" }) {
  const { t } = await getServerTranslation();
  const line =
    status === "none" ? t("portal.invitation.guestsCardNone") : status === "draft" ? t("portal.invitation.guestsCardDraft") : t("portal.invitation.guestsCardPublished");
  // Always the featured card: the invitation comes first, whether or not it is published yet.
  const published = false;
  return (
    <Link
      href="/portal/guests/invitation"
      className={`relative flex min-h-[5.5rem] items-center gap-4 overflow-hidden rounded-3xl px-5 py-4 shadow-rn-card ring-1 transition-transform active:scale-[0.99] ${
        published
          ? "bg-card ring-gold/50 hover:bg-primary-soft/60"
          : "bg-gradient-to-br from-primary to-[#5e1f3d] text-primary-foreground ring-gold/60 shadow-rn-hero-success"
      }`}
    >
      {!published ? <BotanicalSprig className="absolute -right-2 -top-2 h-28 w-20 text-primary-foreground/20" /> : null}
      <span
        className={`relative flex size-12 shrink-0 items-center justify-center rounded-full ${published ? "bg-primary-soft text-success" : "bg-primary-foreground/15 text-primary-foreground"}`}
      >
        <Mail className="size-5" aria-hidden />
        <span className="absolute -left-2.5 -top-2.5 flex size-6 items-center justify-center rounded-full bg-card font-serif text-sm font-semibold text-success ring-1 ring-gold/70">
          1
        </span>
      </span>
      <span className="relative flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-serif text-lg font-semibold leading-tight">{t("portal.invitation.guestsCardTitle")}</span>
        <span className={`text-app-sm ${published ? "text-muted-foreground" : "text-primary-foreground/85"}`}>{line}</span>
        <span
          className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-3.5 py-1.5 text-app-sm font-semibold ${
            published ? "bg-primary-soft text-success dark:!text-white" : "bg-card text-success"
          }`}
        >
          {status === "none" ? t("portal.invitation.guestsCardCreate") : t("portal.invitation.guestsCardEdit")}
          <ChevronRight className="size-4" aria-hidden />
        </span>
      </span>
    </Link>
  );
}
