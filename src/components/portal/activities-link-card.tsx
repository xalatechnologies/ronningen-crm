import { CalendarHeart, ChevronRight } from "lucide-react";
import Link from "next/link";

import { getServerTranslation } from "@/i18n/server";

/** Entry to the activities screen from the guest list. */
export async function ActivitiesLinkCard({ count }: { count: number }) {
  const { t } = await getServerTranslation();
  return (
    <Link
      href="/portal/guests/activities"
      className="flex min-h-16 items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/8 transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
        <CalendarHeart className="size-5" aria-hidden />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="font-semibold">{t("portal.activities.cardTitle")}</span>
        <span className="text-app-sm text-muted-foreground">{count > 0 ? t("portal.activities.cardCount", { count }) : t("portal.activities.cardNone")}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
