"use client";

import {
  RN_NATIVE_SELECT_CHEVRON_CLASS,
  RN_NATIVE_SELECT_CLASS,
} from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

export type NativeSelectProps = ComponentPropsWithoutRef<"select"> & {
  /** Classes on the outer wrapper (e.g. margin). */
  wrapperClassName?: string;
};

/**
 * Styled native `<select>` with chevron — matches `SelectTrigger` (Base UI) and form inputs.
 */
export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  function NativeSelect({ className, wrapperClassName, ...props }, ref) {
    return (
      <div className={cn("relative w-full", wrapperClassName)}>
        <select
          ref={ref}
          data-slot="native-select"
          className={cn(RN_NATIVE_SELECT_CLASS, className)}
          {...props}
        />
        <ChevronDown
          className={cn(RN_NATIVE_SELECT_CHEVRON_CLASS)}
          aria-hidden
        />
      </div>
    );
  },
);
