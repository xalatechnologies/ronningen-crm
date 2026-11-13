import { ChevronRight, Mail } from "lucide-react";
import Link from "next/link";

import { getServerTranslation } from "@/i18n/server";

/** Entry to the invitation designer from the guest list, with the design's current state. */
export async function InviteLinkCard({ status }: { status: "none" | "draft" | "published" }) {
  const { t } = await getServerTranslation();
  const line =
    status === "none" ? t("portal.invitation.guestsCardNone") : status === "draft" ? t("portal.invitation.guestsCardDraft") : t("portal.invitation.guestsCardPublished");
  return (
    <Link
      href="/portal/guests/invitation"
      className="flex min-h-[4.5rem] items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50 active:bg-muted"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
        <Mail className="size-5" aria-hidden />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="font-semibold">{t("portal.invitation.guestsCardTitle")}</span>
        <span className="text-app-sm text-muted-foreground">{line}</span>
      </span>
      <span className="hidden text-app-sm font-semibold text-success sm:inline dark:!text-white">
        {status === "none" ? t("portal.invitation.guestsCardCreate") : t("portal.invitation.guestsCardEdit")}
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
