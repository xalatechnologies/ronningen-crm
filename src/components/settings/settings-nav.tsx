"use client";

import { useOrganizationPermissions } from "@/hooks/use-organization-permissions";
import { useTranslation } from "@/i18n/client";
import { settingsSectionTitle } from "@/lib/navigation/nav-labels";
import type { SettingsSection } from "@/lib/settings/settings-links";
import { visibleSettingsSections } from "@/lib/settings/settings-links";
import { RN_NAV_LINK_ACTIVE, RN_NAV_LINK_ACTIVE_ICON } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition, type MouseEvent } from "react";

function SettingsNavLink({
  section,
  isActive,
}: {
  section: SettingsSection;
  isActive: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const Icon = section.icon;
  const showPending = isPending && !isActive;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      isActive ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }
    event.preventDefault();
    startTransition(() => {
      router.push(section.href);
    });
  }

  return (
    <Link
      href={section.href}
      prefetch
      onMouseEnter={() => router.prefetch(section.href)}
      onFocus={() => router.prefetch(section.href)}
      onClick={handleClick}
      className={cn(
        "flex shrink-0 items-center gap-2.5 rounded-md border-2 px-3 py-2.5 text-sm font-semibold transition-colors lg:w-full lg:px-4 lg:py-3 lg:text-base",
        isActive
          ? RN_NAV_LINK_ACTIVE
          : "border-transparent text-muted-foreground hover:border-rn-border-strong/60 hover:bg-rn-surface-row-hover hover:text-foreground",
        showPending && "opacity-75",
      )}
      aria-current={isActive ? "page" : undefined}
      aria-busy={showPending || undefined}
    >
      <Icon
        className={cn(
          "size-5 shrink-0",
          isActive ? RN_NAV_LINK_ACTIVE_ICON : "opacity-85",
        )}
        aria-hidden
      />
      {settingsSectionTitle(section.id, t)}
    </Link>
  );
}

export function SettingsNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { role } = useOrganizationPermissions();
  const sections = visibleSettingsSections(role);

  return (
    <nav
      aria-label={t("navigation.settings")}
      className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0"
    >
      {sections.map((section) => {
        const isActive =
          section.id === "overview"
            ? pathname === "/app/settings"
            : pathname.startsWith(section.href);

        return (
          <SettingsNavLink
            key={section.id}
            section={section}
            isActive={isActive}
          />
        );
      })}
    </nav>
  );
}
