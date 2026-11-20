"use client";

import { BadgeCheck, CircleSlash, HeartCrack, Hourglass, MessageCircleHeart, PencilLine, Repeat2, Undo2, type LucideIcon } from "lucide-react";

import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import { cn } from "@/lib/utils";
import type { WishStatus } from "@/lib/portal/wishlist-rules";

const TONE: Record<WishStatus, string> = {
  draft: "bg-foreground/8 text-muted-foreground",
  requested: "bg-status-warning-bg text-status-warning-text",
  quoted: "bg-status-info-bg text-status-info-text",
  countered: "bg-status-warning-bg text-status-warning-text",
  approved: "bg-status-success-bg text-status-success-text",
  declined: "bg-status-danger-bg text-status-danger-text",
  withdrawn: "bg-foreground/8 text-muted-foreground",
  unavailable: "bg-status-danger-bg text-status-danger-text",
};

const ICON: Record<WishStatus, LucideIcon> = {
  draft: PencilLine,
  requested: Hourglass,
  quoted: MessageCircleHeart,
  countered: Repeat2,
  approved: BadgeCheck,
  declined: CircleSlash,
  withdrawn: Undo2,
  unavailable: HeartCrack,
};

export function WishStatusChip({ status }: { status: WishStatus }) {
  const { t } = useTranslation();
  return (
    <span className={cn("inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-app-xs font-semibold", TONE[status])}>
      {(() => {
        const Icon = ICON[status];
        return <Icon aria-hidden className="mr-1 size-3.5" strokeWidth={2} />;
      })()}
      {t(`portal.wishlist.status.${status}` as TranslationKey)}
    </span>
  );
}
