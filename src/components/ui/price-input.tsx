"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function isZeroDisplay(value: string): boolean {
  if (value === "" || value === "-") return false;
  const n = Number(value);
  return Number.isFinite(n) && n === 0;
}

function setInputValue(
  event: React.FocusEvent<HTMLInputElement>,
  value: string,
  onChange?: React.ChangeEventHandler<HTMLInputElement>,
) {
  const input = event.currentTarget;
  input.value = value;
  onChange?.({
    ...event,
    target: input,
    currentTarget: input,
  } as React.ChangeEvent<HTMLInputElement>);
}

export const PriceInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(function PriceInput(
  {
    className,
    onFocus,
    onBlur,
    onChange,
    min = 0,
    step = 100,
    type = "number",
    ...props
  },
  ref,
) {
  return (
    <Input
      ref={ref}
      type={type}
      min={min}
      step={step}
      inputMode="decimal"
      className={cn("tabular-nums", className)}
      onFocus={(event) => {
        onFocus?.(event);
        if (event.defaultPrevented) return;
        if (isZeroDisplay(event.currentTarget.value)) {
          setInputValue(event, "", onChange);
        }
      }}
      onBlur={(event) => {
        if (event.currentTarget.value === "") {
          setInputValue(event, "0", onChange);
        }
        onBlur?.(event);
      }}
      onChange={onChange}
      {...props}
    />
  );
});
