"use client";

import { useId } from "react";

import { Switch } from "@/components/ui/switch";

type Props = {
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** One setting: title and explanation on the left, the switch on the right. */
export function SettingRow({ title, description, checked, onCheckedChange, disabled }: Props) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p id={`${id}-label`} className="font-medium text-foreground">
          {title}
        </p>
        {description ? (
          <p id={`${id}-desc`} className="mt-0.5 text-app-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
      />
    </div>
  );
}
