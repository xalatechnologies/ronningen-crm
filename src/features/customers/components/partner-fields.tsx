"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutocompleteField } from "@/components/ui/autocomplete-field";
import { Textarea } from "@/components/ui/textarea";
import { type PartnerFormInput } from "@/lib/validations";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";

import { partnerCategoryLabel, partnerCategorySuggestions, partnerLabelToCategoryLocalized } from "@/features/customers/lib/partner-categories";
import { Controller, type UseFormReturn } from "react-hook-form";


const fieldClass =
  "h-12 w-full rounded-xl border border-foreground/25 bg-background px-4 text-base shadow-none outline-none transition-colors hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

export function PartnerFields({
  form,
  idPrefix,
}: {
  form: UseFormReturn<PartnerFormInput>;
  idPrefix: string;
}) {
  const { t } = useTranslation();
  const { register, control, formState } = form;
  const err = formState.errors;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-cat`}>{t("common.category")}</Label>
        <Controller
          name="category"
          control={control}
          render={({ field, fieldState }) => (
            <AutocompleteField
              id={`${idPrefix}-cat`}
              value={partnerCategoryLabel(field.value ?? "", t)}
              onValueChange={(value) =>
                field.onChange(partnerLabelToCategoryLocalized(value, t))
              }
              suggestions={partnerCategorySuggestions(t)}
              placeholder={t("customers.partnerForm.categoryPlaceholder")}
              aria-label={t("customers.partnerForm.categoryAria")}
              aria-invalid={fieldState.invalid}
              inputClassName={fieldClass}
            />
          )}
        />
        <p className="text-xs text-muted-foreground">
          {t("customers.partnerForm.categoryHint")}
        </p>
        {err.category ? (
          <p className="text-xs text-destructive">{err.category.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>{t("customers.partnerForm.nameCompany")}</Label>
        <Input id={`${idPrefix}-name`} {...register("name")} className={fieldClass} />
        {err.name ? (
          <p className="text-xs text-destructive">{err.name.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-phone`}>{t("common.fields.phone")}</Label>
        <Input
          id={`${idPrefix}-phone`}
          {...register("phone")}
          className={fieldClass}
          inputMode="tel"
        />
        {err.phone ? (
          <p className="text-xs text-destructive">{err.phone.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-email`}>{t("common.fields.email")}</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          {...register("email")}
          className={fieldClass}
        />
        {err.email ? (
          <p className="text-xs text-destructive">{err.email.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-notes`}>{t("common.fields.notes")}</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          {...register("notes")}
          rows={4}
          className={cn(fieldClass, "min-h-24 py-3")}
          placeholder={t("customers.partnerForm.notesPlaceholder")}
        />
        {err.notes ? (
          <p className="text-xs text-destructive">{err.notes.message}</p>
        ) : null}
      </div>
    </div>
  );
}
