"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceInput } from "@/components/ui/price-input";
import type {
  BookingAddonOption,
  BookingPackageAddonFormValues,
  BookingPackageOption,
} from "@/lib/bookings/commercial-lines";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { bookingPackageListBlurb } from "@/lib/validations";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  useFieldArray,
  useWatch,
  Controller,
} from "react-hook-form";

function errorText(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.length > 0 ? message : null;
}

type CustomAddonLineError = {
  name?: { message?: string };
  priceNok?: { message?: string };
};

function RequiredMark() {
  return (
    <span className="font-semibold text-destructive tabular-nums" aria-hidden>
      {" *"}
    </span>
  );
}

type Props<T extends BookingPackageAddonFormValues> = {
  control: Control<T>;
  register: UseFormRegister<T>;
  setValue: UseFormSetValue<T>;
  errors: FieldErrors<T>;
  packages: BookingPackageOption[];
  addons: BookingAddonOption[];
  fieldClass: string;
  labelClass: string;
  idPrefix: string;
  allowEmptyPackage?: boolean;
  disabled?: boolean;
  catalogLoading?: boolean;
};

export function BookingPackageAddonsFields<T extends BookingPackageAddonFormValues>({
  control,
  register,
  setValue,
  errors,
  packages,
  addons,
  fieldClass,
  labelClass,
  idPrefix,
  allowEmptyPackage = false,
  disabled = false,
  catalogLoading = false,
}: Props<T>) {
  const { t, formatCurrency } = useTranslation();
  const packageSource = useWatch({ control, name: "packageSource" as never }) as unknown as
    | "catalog"
    | "custom";
  const selectedPackageId = useWatch({
    control,
    name: "selectedPackageId" as never,
  }) as unknown as string;
  const selectedAddonIds =
    (useWatch({ control, name: "selectedAddonIds" as never }) as string[] | undefined) ??
    [];
  const { fields: customAddonFields, append, remove } = useFieldArray({
    control,
    name: "customAddonLines" as never,
  });
  const defaultPackageId = packages[0]?.id ?? "";
  const customAddonLineErrors = errors.customAddonLines as
    | CustomAddonLineError[]
    | undefined;

  const noPackagesHintParts = useMemo(() => {
    const pricingMarker = "\x00PRICING\x00";
    const customMarker = "\x00CUSTOM\x00";
    const text = t("bookings.form.noPackagesHint", {
      pricing: pricingMarker,
      custom: customMarker,
    });
    const [beforePricing, restAfterPricing = ""] = text.split(pricingMarker);
    const [middle, after = ""] = restAfterPricing.split(customMarker);
    return { beforePricing, middle, after };
  }, [t]);

  const noCatalogAddonsHintParts = useMemo(() => {
    const pricingMarker = "\x00PRICING\x00";
    const text = t("bookings.form.noCatalogAddons", {
      pricing: pricingMarker,
    });
    const [beforePricing, after = ""] = text.split(pricingMarker);
    return { beforePricing, after };
  }, [t]);

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <div className="space-y-4">
        <Label className={labelClass}>
          {t("bookings.form.servicePackage")}
          {allowEmptyPackage ? null : <RequiredMark />}
        </Label>
        {catalogLoading ? (
          <p className="text-app-xs text-muted-foreground">{t("common.actions.loading")}</p>
        ) : packages.length > 0 ? (
          <Controller
            name={"packageSource" as never}
            control={control}
            render={({ field }) => (
              <div
                className="flex flex-wrap gap-3"
                role="group"
                aria-label={t("bookings.form.packageSourceAria")}
              >
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border-2 px-3 py-2 text-app-sm font-medium transition-colors",
                    field.value === "catalog"
                      ? "border-success bg-success/5 text-rn-text-heading"
                      : "border-rn-border-strong hover:bg-rn-surface-row-hover",
                  )}
                >
                  <input
                    type="radio"
                    className="size-4 accent-success"
                    name={field.name}
                    value="catalog"
                    checked={field.value === "catalog"}
                    onChange={() => {
                      field.onChange("catalog");
                      if (defaultPackageId && !allowEmptyPackage) {
                        setValue("selectedPackageId" as never, defaultPackageId as never, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      }
                    }}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                  {t("bookings.form.fromCatalog")}
                </label>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border-2 px-3 py-2 text-app-sm font-medium transition-colors",
                    field.value === "custom"
                      ? "border-success bg-success/5 text-rn-text-heading"
                      : "border-rn-border-strong hover:bg-rn-surface-row-hover",
                  )}
                >
                  <input
                    type="radio"
                    className="size-4 accent-success"
                    name={field.name}
                    value="custom"
                    checked={field.value === "custom"}
                    onChange={() => {
                      field.onChange("custom");
                      setValue("selectedPackageId" as never, "" as never, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                    onBlur={field.onBlur}
                  />
                  {t("bookings.form.customPackage")}
                </label>
              </div>
            )}
          />
        ) : (
          <p className="text-app-xs text-rn-text-body">
            {noPackagesHintParts.beforePricing}
            <Link
              href="/app/pricing"
              className="font-semibold text-success underline-offset-2 hover:underline"
            >
              {t("navigation.pricing")}
            </Link>
            {noPackagesHintParts.middle}
            <span className="font-medium">{t("bookings.form.customPackageLabel")}</span>
            {noPackagesHintParts.after}
          </p>
        )}
              {errorText(errors.packageSource) ? (
          <p className="text-app-xs text-destructive">{errorText(errors.packageSource)}</p>
        ) : null}
        {packageSource === "catalog" && !catalogLoading && packages.length > 0 ? (
          <div className="flex flex-col gap-3">
            {allowEmptyPackage ? (
              <label
                className={cn(
                  "flex cursor-pointer items-center rounded-md border-2 p-4 transition-colors",
                  !selectedPackageId
                    ? "border-success bg-success/5 shadow-sm"
                    : "border-rn-border-strong hover:bg-rn-surface-row-hover",
                )}
              >
                <input
                  type="radio"
                  value=""
                  className="size-5 accent-success"
                  checked={!selectedPackageId}
                  onChange={() =>
                    setValue("selectedPackageId" as never, "" as never, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                />
                <span className="ml-4 font-semibold text-rn-text-heading">
                  {t("bookings.form.noPackageSelected")}
                </span>
              </label>
            ) : null}
            {packages.map((pkg) => {
              const blurb = bookingPackageListBlurb(pkg.description);
              return (
                <label
                  key={pkg.id}
                  className={cn(
                    "flex cursor-pointer items-center rounded-md border-2 p-4 transition-colors",
                    selectedPackageId === pkg.id
                      ? "border-success bg-success/5 shadow-sm"
                      : "border-rn-border-strong hover:bg-rn-surface-row-hover",
                  )}
                >
                  <input
                    type="radio"
                    value={pkg.id}
                    className="size-5 accent-success"
                    {...register("selectedPackageId" as never)}
                  />
                  <div className="ml-4 min-w-0 flex-1">
                    <span className="block font-semibold text-rn-text-heading">
                      {pkg.name}
                    </span>
                    {blurb ? (
                      <span className="text-app-xs text-muted-foreground">{blurb}</span>
                    ) : null}
                    <span className="mt-0.5 block text-app-xs font-semibold tabular-nums text-rn-text-slate">
                      {Number(pkg.price) <= 0
                        ? t("bookings.form.priceOnAgreement")
                        : formatCurrency(Number(pkg.price))}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        ) : null}
        {catalogLoading ? null : packageSource === "custom" || packages.length === 0 ? (
          <div className="space-y-3 rounded-md border-2 border-rn-border-strong bg-rn-surface-wash/40 p-4">
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-custom-pkg-name`} className={labelClass}>
                {t("bookings.form.customPackageName")}
                <RequiredMark />
              </Label>
              <Input
                id={`${idPrefix}-custom-pkg-name`}
                className={cn(fieldClass, errors.customPackageName && "border-destructive")}
                placeholder={t("bookings.form.customPackageNamePlaceholder")}
                {...register("customPackageName" as never)}
                aria-invalid={!!errors.customPackageName}
              />
              {errorText(errors.customPackageName) ? (
                <p className="text-app-xs text-destructive">
                  {errorText(errors.customPackageName)}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-custom-pkg-price`} className={labelClass}>
                {t("bookings.form.packagePrice")}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-app-sm font-semibold text-rn-text-slate md:left-4">
                  kr
                </span>
                <PriceInput
                  id={`${idPrefix}-custom-pkg-price`}
                  className={cn(
                    fieldClass,
                    "pl-10 md:pl-11",
                    errors.customPackagePrice && "border-destructive",
                  )}
                  {...register("customPackagePrice" as never)}
                  aria-invalid={!!errors.customPackagePrice}
                />
              </div>
              <p className="text-app-xs text-muted-foreground">
                {t("bookings.form.packagePriceHint")}
              </p>
              {errorText(errors.customPackagePrice) ? (
                <p className="text-app-xs text-destructive">
                  {errorText(errors.customPackagePrice)}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        {errorText(errors.selectedPackageId) ? (
          <p className="text-app-xs text-destructive">{errorText(errors.selectedPackageId)}</p>
        ) : null}
      </div>
      <div className="space-y-4">
        <Label className={labelClass}>{t("bookings.form.addons")}</Label>
        <p className="text-app-xs text-rn-text-body">{t("bookings.form.addonsHint")}</p>
        {catalogLoading ? (
          <p className="text-app-xs text-muted-foreground">{t("common.actions.loading")}</p>
        ) : addons.length === 0 ? (
          <p className="rounded-md border border-dashed border-rn-border-strong bg-rn-surface-wash/30 px-3 py-2 text-app-xs text-rn-text-body">
            {noCatalogAddonsHintParts.beforePricing}
            <Link
              href="/app/pricing"
              className="font-semibold text-success underline-offset-2 hover:underline"
            >
              {t("navigation.pricing")}
            </Link>
            {noCatalogAddonsHintParts.after}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {addons.map((addon) => {
              const checked = selectedAddonIds.includes(addon.id);
              return (
                <label
                  key={addon.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border-2 border-transparent p-3 transition-colors hover:border-rn-border-strong hover:bg-rn-surface-row-hover"
                >
                  <input
                    type="checkbox"
                    className="size-5 shrink-0 rounded accent-success"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...selectedAddonIds, addon.id]
                        : selectedAddonIds.filter((id) => id !== addon.id);
                      setValue("selectedAddonIds" as never, next as never, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-app-sm font-medium leading-snug text-rn-text-heading">
                      {addon.name}
                    </span>
                    <span className="mt-0.5 block text-app-xs tabular-nums text-rn-text-slate">
                      {addon.price <= 0
                        ? t("bookings.form.priceOnAgreement")
                        : `+${formatCurrency(addon.price)}`}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
        {errors.selectedAddonIds ? (
          <p className="text-app-xs text-destructive">{errorText(errors.selectedAddonIds)}</p>
        ) : null}
        <div className="space-y-3 border-t border-rn-border-strong pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={labelClass}>{t("bookings.form.customAddons")}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 rounded-md font-semibold"
              onClick={() => append({ name: "", priceNok: 0 } as never)}
              disabled={customAddonFields.length >= 24}
            >
              <Plus className="size-4" aria-hidden />
              {t("bookings.form.addLine")}
            </Button>
          </div>
          {customAddonFields.length === 0 ? (
            <p className="text-app-xs text-muted-foreground">
              {t("bookings.form.noCustomAddons")}
            </p>
          ) : (
            <ul className="space-y-3">
              {customAddonFields.map((field, index) => (
                <li
                  key={field.id}
                  className="flex flex-col gap-2 rounded-md border-2 border-rn-border-strong bg-background p-3 sm:flex-row sm:items-end"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <Label
                      className="text-[11px] font-semibold uppercase tracking-wider text-rn-text-slate"
                      htmlFor={`${idPrefix}-custom-addon-name-${field.id}`}
                    >
                      {t("common.fields.name")}
                    </Label>
                    <Input
                      id={`${idPrefix}-custom-addon-name-${field.id}`}
                      className={cn(
                        fieldClass,
                        customAddonLineErrors?.[index]?.name && "border-destructive",
                      )}
                      placeholder={t("bookings.extraServingPlaceholder")}
                      {...register(`customAddonLines.${index}.name` as never)}
                      aria-invalid={!!customAddonLineErrors?.[index]?.name}
                    />
                    {customAddonLineErrors?.[index]?.name?.message ? (
                      <p className="text-app-xs text-destructive">
                        {customAddonLineErrors[index]?.name?.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="w-full space-y-2 sm:w-40">
                    <Label
                      className="text-[11px] font-semibold uppercase tracking-wider text-rn-text-slate"
                      htmlFor={`${idPrefix}-custom-addon-price-${field.id}`}
                    >
                      {t("bookings.form.priceNok")}
                    </Label>
                    <PriceInput
                      id={`${idPrefix}-custom-addon-price-${field.id}`}
                      step={50}
                      className={cn(
                        fieldClass,
                        customAddonLineErrors?.[index]?.priceNok && "border-destructive",
                      )}
                      {...register(`customAddonLines.${index}.priceNok` as never, {
                        valueAsNumber: true,
                      })}
                      aria-invalid={!!customAddonLineErrors?.[index]?.priceNok}
                    />
                    {customAddonLineErrors?.[index]?.priceNok?.message ? (
                      <p className="text-app-xs text-destructive">
                        {customAddonLineErrors[index]?.priceNok?.message}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => remove(index)}
                    aria-label={t("bookings.form.removeAddonLine")}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
