import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

/** aria attributes that link an input to its hint and error text. The hint is dropped while an error is shown. */
export function fieldAria(id: string, hint?: string, error?: string) {
  const describedBy = [hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return { "aria-describedby": describedBy || undefined, "aria-invalid": error ? (true as const) : undefined };
}

/** Label, input, hint and error for one field of the organization profile. */
export function ProfileField({
  id,
  label,
  hint,
  error,
  tag,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  /** Small note next to the label, for example "Required for setup". */
  tag?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="text-app-sm font-semibold text-foreground">
          {label}
        </Label>
        {tag ? <span className="text-app-xs text-muted-foreground">{tag}</span> : null}
      </div>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-app-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-app-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const FIELD_CLASS =
  "h-11 rounded-xl border border-foreground/25 bg-background px-4 text-base hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20 aria-invalid:border-destructive";
