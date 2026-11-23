import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

function initialsOf(name: string, email: string): string {
  const source = name.trim() || email.trim();
  const parts = source.split(/[\s@.]+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

/** Who is signed in: a large avatar with initials, the name and the e-mail address. */
export function AccountSummary({ name, email }: { name: string; email: string }) {
  return (
    <div className={cn(RN_CARD_SHELL, "flex items-center gap-4 p-5 md:p-6")}>
      <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-full bg-success/10 text-lg font-bold text-success ring-1 ring-success/20 dark:bg-white/10 dark:text-white">
        {initialsOf(name, email)}
      </span>
      <div className="min-w-0">
        <p className="truncate font-heading text-lg font-semibold text-foreground">{name.trim() || email}</p>
        {name.trim() ? <p className="truncate text-app-sm text-muted-foreground">{email}</p> : null}
      </div>
    </div>
  );
}
