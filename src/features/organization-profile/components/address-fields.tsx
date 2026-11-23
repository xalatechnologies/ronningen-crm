"use client";

import type { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";

import { AddressField } from "@/components/forms/address-field";
import { Input } from "@/components/ui/input";
import { FIELD_CLASS, fieldAria, ProfileField } from "@/features/organization-profile/components/profile-field";
import { useTranslation } from "@/i18n/client";
import type { OrganizationProfileFormInput } from "@/lib/validations";

/** Street address with address suggestions, an optional second line, postal code and city. */
export function OrganizationAddressFields({
  register,
  setValue,
  errors,
  requiredTag,
}: {
  register: UseFormRegister<OrganizationProfileFormInput>;
  setValue: UseFormSetValue<OrganizationProfileFormInput>;
  errors: FieldErrors<OrganizationProfileFormInput>;
  requiredTag: string;
}) {
  const { t } = useTranslation();
  const postalError = errors.postalCode?.message;
  const cityError = errors.city?.message;
  return (
    <>
      <ProfileField id="org-addr1" label={t("settings.orgProfile.addressLine1")} tag={requiredTag}>
        <AddressField mode="organization" register={register} setValue={setValue} id="org-addr1" className={FIELD_CLASS} />
      </ProfileField>
      <ProfileField id="org-addr2" label={t("settings.orgProfile.addressLine2")}>
        <Input id="org-addr2" className={FIELD_CLASS} placeholder={t("common.actions.optional")} autoComplete="address-line2" {...register("addressLine2")} />
      </ProfileField>
      <div className="grid gap-4 sm:grid-cols-2">
        <ProfileField id="org-postal" label={t("settings.orgProfile.postalCode")} error={postalError}>
          <Input
            id="org-postal"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={4}
            className={FIELD_CLASS}
            {...fieldAria("org-postal", undefined, postalError)}
            {...register("postalCode")}
          />
        </ProfileField>
        <ProfileField id="org-city" label={t("settings.orgProfile.city")} error={cityError} tag={requiredTag}>
          <Input id="org-city" autoComplete="address-level2" className={FIELD_CLASS} {...fieldAria("org-city", undefined, cityError)} {...register("city")} />
        </ProfileField>
      </div>
    </>
  );
}
