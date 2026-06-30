"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { FormSelectField, toIdNameOptions } from "@/components/ui/form-select";
import { useOrganizationPermissions } from "@/hooks/use-organization-permissions";
import { TENANT_SETUP_LOKALER_PATH } from "@/lib/organizations/tenant-setup";
import { canManageBookings } from "@/lib/role-access";
import { RN_SELECT_TRIGGER_FIELD_CLASS } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import Link from "next/link";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

export type PropertySelectFieldProps<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  properties: readonly { id: string; name: string }[];
  id?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  /** When true, copy explains lokale is optional but still guides setup. */
  optional?: boolean;
};

export function PropertySelectField<T extends FieldValues>({
  name,
  control,
  properties,
  id,
  disabled = false,
  className,
  placeholder = "— Ikke valgt —",
  optional = false,
}: PropertySelectFieldProps<T>) {
  const { role } = useOrganizationPermissions();
  const canManageProperties = canManageBookings(role);

  if (properties.length === 0) {
    return (
      <div
        className="rounded-md border-2 border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:text-amber-50"
        role="status"
      >
        <p>
          {optional
            ? "Ingen lokaler er registrert ennå."
            : "Du må registrere minst ett lokale først."}
          {canManageProperties ? (
            <>
              {" "}
              Gå til{" "}
              <Link
                href={TENANT_SETUP_LOKALER_PATH}
                className="font-semibold underline underline-offset-2"
              >
                Innstillinger → Lokaler
              </Link>{" "}
              for å opprette et lokale
              {optional ? " du kan knytte til skjemaet." : "."}
            </>
          ) : (
            " Be en administrator med redigeringstilgang registrere lokaler under Innstillinger."
          )}
        </p>
        {canManageProperties ? (
          <Button
            type="button"
            nativeButton={false}
            render={<Link href={TENANT_SETUP_LOKALER_PATH} />}
            className={cn(buttonVariants({ variant: "success", size: "sm" }), "mt-3")}
          >
            <Plus className="size-4" aria-hidden />
            Registrer lokale
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <FormSelectField
      name={name}
      control={control}
      id={id}
      disabled={disabled}
      className={cn(RN_SELECT_TRIGGER_FIELD_CLASS, "w-full font-medium", className)}
      placeholder={placeholder}
      options={toIdNameOptions(properties)}
    />
  );
}
