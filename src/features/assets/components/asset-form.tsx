"use client";

import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/ui/form-select";
import { PropertySelectField } from "@/components/properties/property-select-field";
import { assetFormSchema, type AssetFormInput, ASSET_CONDITION_PRESET_VALUES, ASSET_INSURANCE_PRESET_VALUES } from "@/lib/validations";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useTranslation } from "@/i18n/client";
import type { Translator } from "@/i18n/types";
import { useId, useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";


import { createAsset, toAssetPayload, updateAsset } from "@/features/assets/data/assets";
import type { AssetListItem } from "@/features/assets/types";

const CONDITION_PRESET_VALUES = ASSET_CONDITION_PRESET_VALUES;
const INSURANCE_PRESET_VALUES = ASSET_INSURANCE_PRESET_VALUES;

function conditionPresetOptions(t: Translator) {
  return (
    Object.entries(CONDITION_PRESET_VALUES) as Array<
      [keyof typeof CONDITION_PRESET_VALUES, string]
    >
  ).map(([key, value]) => ({
    value,
    label: t(`assets.conditions.${key}`),
  }));
}

function insurancePresetOptions(t: Translator) {
  return (
    Object.entries(INSURANCE_PRESET_VALUES) as Array<
      [keyof typeof INSURANCE_PRESET_VALUES, string]
    >
  ).map(([key, value]) => ({
    value,
    label: t(`assets.insurance.${key}`),
  }));
}

export function AssetForm({
  properties,
  row,
  suggestedPropertyId,
  onClose,
}: {
  properties: { id: string; name: string }[];
  row: AssetListItem | null;
  /** Når ny rad: forhåndsvelg lokale fra aktiv liste-filter. */
  suggestedPropertyId?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const { invalidateAssets } = useTenantDataInvalidation();
  const isEdit = row != null;

  const defaultProperty =
    row?.property_id ??
    (suggestedPropertyId &&
    properties.some((p) => p.id === suggestedPropertyId)
      ? suggestedPropertyId
      : properties[0]?.id) ??
    "";

  const form = useForm<AssetFormInput>({
    resolver: zodResolver(assetFormSchema) as Resolver<AssetFormInput>,
    defaultValues: {
      propertyId: defaultProperty,
      name: row?.name ?? "",
      quantity: row?.quantity ?? 1,
      value: row?.value ?? 0,
      condition: row?.condition ?? CONDITION_PRESET_VALUES.good,
      insuranceStatus: row?.insurance_status ?? INSURANCE_PRESET_VALUES.unknown,
    },
  });

  const idProperty = useId();
  const idName = useId();
  const idQty = useId();
  const idValue = useId();
  const idCondition = useId();
  const idInsurance = useId();

  const conditionOptions = useMemo(() => {
    const presets = conditionPresetOptions(t);
    const c = row?.condition?.trim();
    if (c && !presets.some((p) => p.value === c)) {
      return [
        { value: c, label: `${c} ${t("assets.savedSuffix")}` },
        ...presets,
      ];
    }
    return presets;
  }, [row?.condition, t]);

  const insuranceOptions = useMemo(() => {
    const presets = insurancePresetOptions(t);
    const c = row?.insurance_status?.trim();
    if (c && !presets.some((p) => p.value === c)) {
      return [
        { value: c, label: `${c} ${t("assets.savedSuffix")}` },
        ...presets,
      ];
    }
    return presets;
  }, [row?.insurance_status, t]);

  const { register, control, handleSubmit, formState, setValue, watch } = form;
  const { isSubmitting } = formState;
  const conditionVal = watch("condition");
  const insuranceVal = watch("insuranceStatus");

  async function onSubmit(data: AssetFormInput) {
    const payload = toAssetPayload(data);

    if (isEdit && row) {
      const { error } = await updateAsset(supabase, row.id, payload);
      if (error) {
        toast.error(t("assets.toasts.updateFailed"), {
          description: error.message,
        });
        return;
      }
      toast.success(t("assets.toasts.updated"));
    } else {
      let orgId: string;
      try {
        orgId = requireOrganizationId(currentOrganizationId);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("common.toasts.noActiveOrg"),
        );
        return;
      }

      const { error } = await createAsset(supabase, orgId, payload);
      if (error) {
        toast.error(t("assets.toasts.createFailed"), {
          description: error.message,
        });
        return;
      }
      toast.success(t("assets.toasts.created"));
    }
    onClose();
    invalidateAssets();
  }

  const title = isEdit ? t("assets.editTitle") : t("assets.newTitle");

  return (
    <>
      <DialogHeader className="space-y-0 border-b border-foreground/10 pb-5 pr-10 text-left sm:pr-12">
        <DialogTitle className="font-heading text-xl font-bold text-rn-text-heading sm:text-2xl">
          {title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isEdit ? t("assets.editFormAria") : t("assets.newFormAria")}
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-6 pt-6"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor={idProperty}
              className="text-sm font-semibold text-foreground"
            >
              {t("finance.filterVenue")}
            </Label>
            <PropertySelectField
              name="propertyId"
              control={control}
              id={idProperty}
              properties={properties}
            />
            {formState.errors.propertyId ? (
              <p className="text-sm text-destructive" role="alert">
                {formState.errors.propertyId.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={idName} className="text-sm font-semibold text-foreground">
              {t("common.fields.name")}
            </Label>
            <Input
              id={idName}
              aria-invalid={!!formState.errors.name}
              className="h-12 rounded-xl border border-foreground/25 bg-background px-4 text-base shadow-none hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20 aria-invalid:border-destructive"
              {...register("name")}
            />
            {formState.errors.name ? (
              <p className="text-sm text-destructive" role="alert">
                {formState.errors.name.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={idQty} className="text-sm font-semibold text-foreground">
                {t("assets.tableQuantity")}
              </Label>
              <Input
                id={idQty}
                aria-invalid={!!formState.errors.quantity}
                className="h-12 rounded-xl border border-foreground/25 bg-background px-4 text-base tabular-nums shadow-none hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20 aria-invalid:border-destructive"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                {...register("quantity", {
                  setValueAs: (v) => {
                    if (v === "" || v == null) return 0;
                    const n = Number(v);
                    return Number.isFinite(n) ? n : 0;
                  },
                })}
              />
              {formState.errors.quantity ? (
                <p className="text-sm text-destructive" role="alert">
                  {formState.errors.quantity.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor={idValue} className="text-sm font-semibold text-foreground">
                {t("assets.tableValue")}{" "}
                <span className="font-normal text-muted-foreground">(NOK)</span>
              </Label>
              <PriceInput
                id={idValue}
                aria-invalid={!!formState.errors.value}
                className="h-12 rounded-xl border border-foreground/25 bg-background px-4 text-base shadow-none hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20 aria-invalid:border-destructive"
                {...register("value", {
                  setValueAs: (v) => {
                    if (v === "" || v == null) return 0;
                    const n = Number(v);
                    return Number.isFinite(n) ? n : 0;
                  },
                })}
              />
              {formState.errors.value ? (
                <p className="text-sm text-destructive" role="alert">
                  {formState.errors.value.message}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor={idCondition}
                className="text-sm font-semibold text-foreground"
              >
                {t("assets.tableCondition")}
              </Label>
              <FormSelect
                id={idCondition}
                aria-label={t("assets.conditionAria")}
                value={conditionVal ?? ""}
                onValueChange={(v) => setValue("condition", v)}
                options={conditionOptions}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor={idInsurance}
                className="text-sm font-semibold text-foreground"
              >
                {t("assets.tableInsurance")}
              </Label>
              <FormSelect
                id={idInsurance}
                aria-label={t("assets.insuranceAria")}
                value={insuranceVal ?? ""}
                onValueChange={(v) => setValue("insuranceStatus", v)}
                options={insuranceOptions}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="-mx-6 -mb-6 mt-2 gap-3 border-t border-foreground/10 bg-card px-6 py-4 sm:-mx-6 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="cta"
            className="rounded-xl border border-foreground/30 bg-card shadow-none hover:bg-muted"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t("common.actions.cancel")}
          </Button>
          <Button
            type="submit"
            variant="success"
            size="cta"
            disabled={isSubmitting}
            className="disabled:opacity-60"
          >
            {isSubmitting
              ? t("common.saving")
              : isEdit
                ? t("common.actions.save")
                : t("assets.createItem")}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
