import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
  /** Buttons at the bottom of the card, split from the content by a line. */
  footer?: ReactNode;
  /** Red icon, title and border for the dangerous part of the page. */
  danger?: boolean;
  className?: string;
};

/** A settings card: icon, title and explanation on top, the content, and an optional row of buttons below. */
export function AccountCard({ id, icon: Icon, title, description, children, footer, danger, className }: Props) {
  return (
    <section aria-labelledby={`${id}-title`} className={cn(RN_CARD_SHELL, "flex flex-col gap-6 p-5 md:p-6", danger && "ring-destructive/30", className)}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
            danger ? "bg-destructive/10 text-destructive ring-destructive/30" : "bg-muted/60 text-muted-foreground ring-foreground/10",
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id={`${id}-title`} className={cn("font-heading text-lg font-semibold", danger ? "text-destructive" : "text-foreground")}>
            {title}
          </h2>
          <p className="mt-1 text-app-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-5">{children}</div>
      {footer ? <div className="border-t border-foreground/10 pt-5">{footer}</div> : null}
    </section>
  );
}

/** A label above its control, with an optional hint underneath. */
export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-app-xs font-semibold text-muted-foreground">
          {label}
        </label>
      ) : (
        <p className="text-app-xs font-semibold text-muted-foreground">{label}</p>
      )}
      {children}
      {hint ? <p className="text-app-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
