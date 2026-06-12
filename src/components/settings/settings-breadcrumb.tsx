"use client";

import { settingsSectionByPath } from "@/lib/settings/settings-links";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

export function SettingsBreadcrumb() {
  const pathname = usePathname();
  const section = settingsSectionByPath(pathname);
  const isHub = pathname === "/app/settings";

  return (
    <nav
      aria-label="Brødsmuler"
      className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground md:mb-6 md:text-base"
    >
      {isHub ? (
        <span className="font-medium text-foreground">Innstillinger</span>
      ) : (
        <>
          <Link
            href="/app/settings"
            className="font-medium transition-colors hover:text-foreground"
          >
            Innstillinger
          </Link>
          <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
          <span className="font-medium text-foreground">
            {section?.title ?? "Innstillinger"}
          </span>
        </>
      )}
    </nav>
  );
}
