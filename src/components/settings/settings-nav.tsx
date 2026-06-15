"use client";

import { visibleSettingsSections } from "@/lib/settings/settings-links";
import { useOrganizationPermissions } from "@/hooks/use-organization-permissions";
import { RN_NAV_LINK_ACTIVE, RN_NAV_LINK_ACTIVE_ICON } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SettingsNav() {
  const pathname = usePathname();
  const { role } = useOrganizationPermissions();
  const sections = visibleSettingsSections(role);

  return (
    <nav
      aria-label="Innstillinger"
      className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0"
    >
      {sections.map((section) => {
        const isActive =
          section.id === "overview"
            ? pathname === "/app/settings"
            : pathname.startsWith(section.href);
        const Icon = section.icon;

        return (
          <Link
            key={section.id}
            href={section.href}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-md border-2 px-3 py-2.5 text-sm font-semibold transition-colors lg:w-full lg:px-4 lg:py-3 lg:text-base",
              isActive
                ? RN_NAV_LINK_ACTIVE
                : "border-transparent text-muted-foreground hover:border-rn-border-strong/60 hover:bg-rn-surface-row-hover hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon
              className={cn(
                "size-5 shrink-0",
                isActive ? RN_NAV_LINK_ACTIVE_ICON : "opacity-85",
              )}
              aria-hidden
            />
            {section.title}
          </Link>
        );
      })}
    </nav>
  );
}
