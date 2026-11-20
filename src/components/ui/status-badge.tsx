import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

/** Full class strings, so Tailwind can see them. Colours come from the `--status-*` tokens. */
const TONE_CLASS: Record<StatusTone, { badge: string; dot: string; text: string }> = {
  success: {
    badge: "border-status-success-border bg-status-success-bg text-status-success-text",
    dot: "bg-status-success-solid",
    text: "text-status-success-text",
  },
  warning: {
    badge: "border-status-warning-border bg-status-warning-bg text-status-warning-text",
    dot: "bg-status-warning-solid",
    text: "text-status-warning-text",
  },
  danger: {
    badge: "border-status-danger-border bg-status-danger-bg text-status-danger-text",
    dot: "bg-status-danger-solid",
    text: "text-status-danger-text",
  },
  info: {
    badge: "border-status-info-border bg-status-info-bg text-status-info-text",
    dot: "bg-status-info-solid",
    text: "text-status-info-text",
  },
  neutral: {
    badge: "border-status-neutral-border bg-status-neutral-bg text-status-neutral-text",
    dot: "bg-status-neutral-solid",
    text: "text-status-neutral-text",
  },
};

export function statusDotClass(tone: StatusTone): string {
  return TONE_CLASS[tone].dot;
}

export function statusTextClass(tone: StatusTone): string {
  return TONE_CLASS[tone].text;
}

/**
 * Status pill: a label plus a dot, so meaning never depends on colour alone.
 * `size="lg"` is the larger uppercase pill used in booking lists.
 */
export function StatusBadge({
  tone,
  children,
  size = "md",
  dot = true,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  size?: "md" | "lg";
  dot?: boolean;
  className?: string;
}) {
  const t = TONE_CLASS[tone];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border font-semibold",
        size === "lg"
          ? "px-3 py-1.5 text-app-xs font-bold tracking-wide uppercase md:px-3.5 md:py-2 md:text-app-sm"
          : "gap-1.5 px-2.5 py-1 text-xs",
        t.badge,
        className,
      )}
    >
      {dot ? (
        <span className={cn("size-1.5 rounded-full", size === "lg" && "mr-2", t.dot)} aria-hidden />
      ) : null}
      {children}
    </span>
  );
}
