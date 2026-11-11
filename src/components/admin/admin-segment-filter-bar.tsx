"use client";

import { Input } from "@/components/ui/input";
import { RN_TEXT_SEGMENT } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export const ADMIN_SEGMENT_BAR_CLASS = cn(
  "admin-segment-bar flex w-full flex-col gap-3 rounded-2xl bg-muted/40 p-2 ring-1 ring-foreground/10 sm:flex-row sm:items-center",
);

export const ADMIN_SEGMENT_SEARCH_INPUT_CLASS =
  "h-11 rounded-xl border border-foreground/25 bg-background pl-10 hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20";

type AdminSegmentFilterBarProps = ComponentProps<"div">;

export function AdminSegmentFilterBar({
  children,
  className,
  ...props
}: AdminSegmentFilterBarProps) {
  return (
    <div className={cn(ADMIN_SEGMENT_BAR_CLASS, className)} {...props}>
      {children}
    </div>
  );
}

type AdminSegmentFilterSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  "aria-label": string;
};

export function AdminSegmentFilterSearch({
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
}: AdminSegmentFilterSearchProps) {
  return (
    <div className="relative w-full min-w-0 shrink-0 sm:w-96 lg:w-[28rem]">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={ADMIN_SEGMENT_SEARCH_INPUT_CLASS}
        aria-label={ariaLabel}
      />
    </div>
  );
}

export function AdminSegmentFilterDivider() {
  return (
    <div
      className="hidden h-8 w-px shrink-0 bg-foreground/15 sm:block"
      aria-hidden
    />
  );
}

type AdminSegmentFilterControlsProps = {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
};

export function AdminSegmentFilterControls({
  children,
  className,
  "aria-label": ariaLabel,
}: AdminSegmentFilterControlsProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:justify-end",
        className,
      )}
      role={ariaLabel ? "group" : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

type AdminSegmentFilterButtonMinWidth = "narrow" | "default";

const ADMIN_SEGMENT_BUTTON_MIN_WIDTH: Record<
  AdminSegmentFilterButtonMinWidth,
  string
> = {
  narrow: "sm:min-w-[6.5rem]",
  default: "sm:min-w-[7.5rem]",
};

export function adminSegmentFilterButtonClass(
  active: boolean,
  minWidth: AdminSegmentFilterButtonMinWidth = "default",
): string {
  return cn(
    RN_TEXT_SEGMENT,
    "min-h-10 flex-1 rounded-full px-4 py-2 transition-colors sm:flex-none",
    ADMIN_SEGMENT_BUTTON_MIN_WIDTH[minWidth],
    active
      ? "border border-success bg-success !text-white shadow-sm"
      : "border border-foreground/20 bg-card font-medium text-foreground hover:border-foreground/40 hover:bg-muted hover:text-foreground",
  );
}
