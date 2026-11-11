"use client";

import { useTranslation } from "@/i18n/client";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type AdminTableDetailLinkProps = {
  href: string;
  title: string;
  subtitle?: string;
  className?: string;
};

/** Tydelig rad-lenke i admin-tabeller (navn + valgfri undertekst). */
export function AdminTableDetailLink({
  href,
  title,
  subtitle,
  className,
}: AdminTableDetailLinkProps) {
  const { t } = useTranslation();
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-[3.25rem] items-center gap-3 px-[length:calc(var(--app-card-padding)*0.4)] py-3 transition-colors",
        "rounded-xl hover:bg-muted/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-foreground transition-colors group-hover:text-success dark:group-hover:!text-white">
          {title}
        </span>
        {subtitle ? (
          <span className="admin-ops-id mt-0.5 block truncate text-app-xs text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-success group-hover:text-white">
        <span className="sr-only">{t("admin.apne")}</span>
        <ChevronRight className="size-4" aria-hidden />
      </span>
    </Link>
  );
}
