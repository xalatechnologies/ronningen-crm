import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { RN_ADMIN_DETAIL_LINK } from "@/lib/rn-ui";
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
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-[3.25rem] items-center gap-3 px-[length:calc(var(--app-card-padding)*0.4)] py-3 transition-colors",
        "rounded-[length:calc(var(--app-radius)-4px)] hover:bg-success/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span className="min-w-0 flex-1">
        <span className={cn(RN_ADMIN_DETAIL_LINK, "underline-offset-4 group-hover:underline")}>
          {title}
        </span>
        {subtitle ? (
          <span className="admin-ops-id mt-0.5 block truncate text-app-xs text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-1 text-app-xs font-semibold text-muted-foreground transition-colors group-hover:text-success dark:group-hover:!text-white">
        <span className="hidden sm:inline">Åpne</span>
        <ChevronRight className="size-4" aria-hidden />
      </span>
    </Link>
  );
}
