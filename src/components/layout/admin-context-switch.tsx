"use client";

import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { useTranslation } from "@/i18n/client";
import { RN_TEXT_SEGMENT } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import Link from "next/link";

const OPTIONS = [
  { id: "app", href: "/app" },
  { id: "platform", href: "/admin" },
] as const;

export type AdminContextSwitchActive = (typeof OPTIONS)[number]["id"];

export function AdminContextSwitch({
  active,
  className,
  onNavigate,
}: {
  active: AdminContextSwitchActive;
  className?: string;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const { isPlatformAdmin, loading } = usePlatformAdmin();

  if (loading || !isPlatformAdmin) {
    return null;
  }

  const labels: Record<AdminContextSwitchActive, string> = {
    app: t("adminNav.switchApp"),
    platform: t("adminNav.switchPlatform"),
  };

  return (
    <div
      role="group"
      aria-label={t("adminNav.switchAria")}
      className={cn("flex w-full gap-1 rounded-xl bg-black/25 p-1", className)}
    >
      {OPTIONS.map((option) => {
        const isActive = active === option.id;
        return (
          <Link
            key={option.id}
            href={option.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              RN_TEXT_SEGMENT,
              "flex min-h-10 flex-1 items-center justify-center rounded-lg px-2 py-1.5 text-center text-app-xs transition-colors outline-none select-none md:min-h-11 md:text-app-sm",
              "focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
              isActive
                ? "bg-white font-bold !text-[#1a4331] shadow-sm"
                : "font-medium text-white/80 hover:bg-white/10 hover:text-white",
            )}
          >
            {labels[option.id]}
          </Link>
        );
      })}
    </div>
  );
}
