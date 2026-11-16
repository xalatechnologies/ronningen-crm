import { ChevronRight, Gift } from "lucide-react";
import Link from "next/link";

import { getServerTranslation } from "@/i18n/server";

/** Entry to the gift wish list (what the couple wishes to receive) from the guest list. */
export async function GiftsLinkCard({ count }: { count: number }) {
  const { t } = await getServerTranslation();
  return (
    <Link
      href="/portal/guests/gifts"
      className="flex min-h-[4.5rem] items-center gap-4 border-t border-gold/30 px-4 py-3 transition-colors hover:bg-muted/50 active:bg-muted"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gold/20 text-primary">
        <Gift className="size-5" aria-hidden />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="font-semibold">{t("portal.gifts.cardTitle")}</span>
        <span className="text-app-sm text-muted-foreground">{count > 0 ? t("portal.gifts.cardCount", { count }) : t("portal.gifts.cardNone")}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
