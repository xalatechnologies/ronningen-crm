"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { ChevronDownIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";

const itemClassName =
  "flex w-full cursor-default items-center rounded-[length:var(--app-radius)] px-2.5 py-2.5 text-app-control font-medium outline-none data-highlighted:bg-rn-surface-row-hover";

export type AutocompleteFieldProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  suggestions: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
};

export function AutocompleteField({
  id,
  value,
  onValueChange,
  suggestions,
  placeholder,
  disabled,
  className,
  inputClassName,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
}: AutocompleteFieldProps) {
  const { t } = useTranslation();
  const { contains } = Autocomplete.useFilter({ sensitivity: "base" });
  const [open, setOpen] = useState(false);
  const [filterWhileOpen, setFilterWhileOpen] = useState(false);

  const visibleItems = useMemo(() => {
    const query = value.trim();
    if (!open || !filterWhileOpen || !query) {
      return [...suggestions];
    }
    return suggestions.filter((item) => contains(item, query));
  }, [contains, filterWhileOpen, open, suggestions, value]);

  return (
    <Autocomplete.Root
      items={suggestions}
      filteredItems={visibleItems}
      filter={null}
      value={value}
      onValueChange={(next, eventDetails) => {
        onValueChange(next);
        if (open && eventDetails.reason === "input-change") {
          setFilterWhileOpen(true);
        }
      }}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setFilterWhileOpen(false);
        }
      }}
      openOnInputClick
      disabled={disabled}
      modal={false}
    >
      <Autocomplete.InputGroup
        className={cn(
          "relative flex w-full min-w-0 items-center",
          className,
        )}
      >
        <Autocomplete.Input
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel}
          autoComplete="off"
          className={cn(
            "h-[max(var(--app-input-min-height),var(--app-tap-target-min))] w-full min-w-0 rounded-[length:var(--app-radius)] border border-input bg-transparent px-2.5 py-1 pr-10 text-app-control transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
            inputClassName,
          )}
        />
        <Autocomplete.Trigger
          type="button"
          aria-label="Vis forslag"
          disabled={disabled}
          className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[length:var(--app-radius)] text-muted-foreground outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        >
          <ChevronDownIcon className="size-4 shrink-0" aria-hidden />
        </Autocomplete.Trigger>
      </Autocomplete.InputGroup>

      <Autocomplete.Portal>
        <Autocomplete.Positioner
          className="isolate z-[100] outline-none"
          positionMethod="fixed"
          side="bottom"
          sideOffset={6}
          align="start"
          collisionAvoidance={{
            side: "shift",
            align: "shift",
            fallbackAxisSide: "none",
          }}
        >
          <Autocomplete.Popup
            className={cn(
              "max-h-60 w-(--anchor-width) min-w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-popover p-1.5 text-app-control text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            <Autocomplete.Empty className="px-2.5 py-2 text-sm text-muted-foreground">
              {t("common.empty.noResults")}
            </Autocomplete.Empty>
            <Autocomplete.List>
              {(item: string) => (
                <Autocomplete.Item
                  key={item}
                  value={item}
                  className={itemClassName}
                >
                  {item}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}

export type AutocompleteFieldControllerProps<T extends FieldValues> = Omit<
  AutocompleteFieldProps,
  "value" | "onValueChange"
> & {
  name: FieldPath<T>;
  control: Control<T>;
};

export function AutocompleteFieldController<T extends FieldValues>({
  name,
  control,
  ...props
}: AutocompleteFieldControllerProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <AutocompleteField
          {...props}
          value={(field.value as string | undefined) ?? ""}
          onValueChange={field.onChange}
          aria-invalid={fieldState.invalid || props["aria-invalid"]}
        />
      )}
    />
  );
}
