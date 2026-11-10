"use client";

import { useTranslation } from "@/i18n/client";
import { AddressField } from "@/components/forms/address-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrganizationProfileFormInput } from "@/lib/validations";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";

type OrganizationAddressFieldsProps = {
  register: UseFormRegister<OrganizationProfileFormInput>;
  setValue: UseFormSetValue<OrganizationProfileFormInput>;
  errors: FieldErrors<OrganizationProfileFormInput>;
  labelClass: string;
  fieldClass: string;
};

export function OrganizationAddressFields({
  register,
  setValue,
  errors,
  labelClass,
  fieldClass,
}: OrganizationAddressFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="space-y-2">
        <Label className={labelClass} htmlFor="org-addr1">
          Adresse
        </Label>
        <AddressField
          mode="organization"
          register={register}
          setValue={setValue}
          id="org-addr1"
          className={fieldClass}
        />
      </div>
      <div className="space-y-2">
        <Label className={labelClass} htmlFor="org-addr2">
          Adresselinje 2
        </Label>
        <Input
          id="org-addr2"
          className={fieldClass}
          placeholder={t("common.actions.optional")}
          autoComplete="address-line2"
          {...register("addressLine2")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className={labelClass} htmlFor="org-postal">
            Postnummer
          </Label>
          <Input
            id="org-postal"
            className={fieldClass}
            autoComplete="postal-code"
            {...register("postalCode")}
          />
          {errors.postalCode ? (
            <p className="text-sm text-destructive">
              {errors.postalCode.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label className={labelClass} htmlFor="org-city">
            Poststed
          </Label>
          <Input
            id="org-city"
            className={fieldClass}
            autoComplete="address-level2"
            {...register("city")}
          />
          {errors.city ? (
            <p className="text-sm text-destructive">{errors.city.message}</p>
          ) : null}
        </div>
      </div>
    </>
  );
}
