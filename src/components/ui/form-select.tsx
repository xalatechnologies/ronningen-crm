"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RN_SELECT_TRIGGER_FIELD_CLASS } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

/** Internal sentinel — maps to empty string in form state. */
const EMPTY_VALUE = "__form_select_empty__";

export type FormSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function toIdNameOptions(
  items: readonly { id: string; name: string }[],
): FormSelectOption[] {
  return items.map((item) => ({ value: item.id, label: item.name }));
}

export function toStringOptions(
  items: readonly string[],
  labelFn?: (value: string) => string,
): FormSelectOption[] {
  return items.map((value) => ({
    value,
    label: labelFn ? labelFn(value) : value,
  }));
}

function toItemValue(value: string): string {
  return value === "" ? EMPTY_VALUE : value;
}

function fromItemValue(value: string | null): string {
  if (value == null || value === EMPTY_VALUE) return "";
  return value;
}

export type FormSelectProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly FormSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
};

const itemClassName =
  "w-full truncate py-2.5 pl-2 pr-8 text-app-control font-medium data-highlighted:bg-rn-surface-row-hover";

export function FormSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  contentClassName,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
}: FormSelectProps) {
  const selectValue = value === "" ? EMPTY_VALUE : value;
  const showPlaceholder = Boolean(placeholder);

  // Base UI resolves trigger labels from `items` when popup options are unmounted.
  const selectItems = useMemo(() => {
    const items: { value: string; label: string }[] = [];
    if (showPlaceholder && placeholder) {
      items.push({ value: EMPTY_VALUE, label: placeholder });
    }
    for (const opt of options) {
      items.push({ value: toItemValue(opt.value), label: opt.label });
    }
    return items;
  }, [options, showPlaceholder, placeholder]);

  return (
    <Select
      value={selectValue}
      onValueChange={(next) => onValueChange(fromItemValue(next))}
      disabled={disabled}
      items={selectItems}
    >
      <SelectTrigger
        id={id}
        size="default"
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        className={cn(RN_SELECT_TRIGGER_FIELD_CLASS, "w-full", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        align="start"
        side="bottom"
        alignItemWithTrigger={false}
        className={cn(
          "max-h-72 w-[var(--anchor-width)] min-w-[var(--anchor-width)] max-w-[var(--anchor-width)] border-2 border-rn-border-strong p-1.5 shadow-rn-card",
          contentClassName,
        )}
      >
        {showPlaceholder ? (
          <SelectItem value={EMPTY_VALUE} className={itemClassName}>
            {placeholder}
          </SelectItem>
        ) : null}
        {options.map((opt) => (
          <SelectItem
            key={`${opt.value}-${opt.label}`}
            value={toItemValue(opt.value)}
            disabled={opt.disabled}
            className={itemClassName}
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export type FormSelectFieldProps<T extends FieldValues> = Omit<
  FormSelectProps,
  "value" | "onValueChange"
> & {
  name: FieldPath<T>;
  control: Control<T>;
};

export function FormSelectField<T extends FieldValues>({
  name,
  control,
  ...props
}: FormSelectFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormSelect
          {...props}
          value={(field.value as string | undefined) ?? ""}
          onValueChange={field.onChange}
          aria-invalid={fieldState.invalid || props["aria-invalid"]}
        />
      )}
    />
  );
}
