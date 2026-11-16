"use client";

import { CalendarHeart, Gift, Mail, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; badge?: string; exact?: boolean };

/**
 * One row of tabs above everything about the guests: the list, the invitation card, activities and gift wishes.
 * It replaces the stack of link cards, so the page is shorter and every part is one tap away from every other.
 * Scrolls sideways on a narrow phone.
 */
export function GuestsSubNav({ inviteStatus, activities, gifts }: { inviteStatus: "none" | "draft" | "published"; activities: number; gifts: number }) {
  const { t } = useTranslation();
  const pathname = usePathname();

  const items: Item[] = [
    { href: "/portal/guests", label: t("portal.guestsNav.guests"), icon: Users, exact: true },
    {
      href: "/portal/guests/invitation",
      label: t("portal.guestsNav.invitation"),
      icon: Mail,
      badge: inviteStatus === "published" ? "✓" : inviteStatus === "draft" ? t("portal.guestsNav.draft") : undefined,
    },
    { href: "/portal/guests/activities", label: t("portal.guestsNav.activities"), icon: CalendarHeart, badge: activities > 0 ? String(activities) : undefined },
    { href: "/portal/guests/gifts", label: t("portal.guestsNav.gifts"), icon: Gift, badge: gifts > 0 ? String(gifts) : undefined },
  ];

  return (
    <nav aria-label={t("portal.guestsNav.label")} className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max min-w-full gap-2 sm:w-auto">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-full px-4 text-app-sm font-semibold ring-1 transition-colors active:scale-[0.98]",
                  active ? "bg-primary text-primary-foreground ring-gold/60 shadow-sm" : "bg-card ring-gold/40 hover:ring-gold",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {item.label}
                {item.badge ? (
                  <span className={cn("rounded-full px-2 py-0.5 text-app-xs tabular-nums", active ? "bg-white/20" : "bg-gold/25 text-primary")}>{item.badge}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
