"use client";

import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import { cn } from "@/lib/utils";
import type { WishStatus } from "@/lib/portal/wishlist-rules";

const TONE: Record<WishStatus, string> = {
  draft: "bg-foreground/8 text-muted-foreground",
  requested: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  quoted: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  countered: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  approved: "bg-success/15 text-success dark:!text-white",
  declined: "bg-destructive/12 text-destructive",
  withdrawn: "bg-foreground/8 text-muted-foreground",
  unavailable: "bg-destructive/12 text-destructive",
};

export function WishStatusChip({ status }: { status: WishStatus }) {
  const { t } = useTranslation();
  return (
    <span className={cn("inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-app-xs font-semibold", TONE[status])}>
      {t(`portal.wishlist.status.${status}` as TranslationKey)}
    </span>
  );
}
