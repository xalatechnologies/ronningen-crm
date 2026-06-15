"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const timePickerSurfaceClass =
  "relative cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0";

function openTimePicker(input: HTMLInputElement) {
  if (typeof input.showPicker !== "function") return;
  try {
    input.showPicker();
  } catch {
    // Unsupported browser or picker already open
  }
}

export function TimePickerField({
  className,
  onClick,
  step = 60,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      type="time"
      step={step}
      className={cn(timePickerSurfaceClass, className)}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) openTimePicker(e.currentTarget);
      }}
      {...props}
    />
  );
}
