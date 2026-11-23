"use client";

import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  className?: string;
};

/** An on/off switch. A real button with role "switch", so keyboard and screen readers work like any switch. */
export function Switch({ id, checked, onCheckedChange, disabled, className, ...aria }: Props) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-success" : "bg-foreground/25",
        className,
      )}
      {...aria}
    >
      <span
        aria-hidden
        className={cn("pointer-events-none block size-5 rounded-full bg-background shadow-sm transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")}
      />
    </button>
  );
}
