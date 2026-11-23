"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";

import { AddressField } from "@/components/forms/address-field";
import { propertyTypeLabel } from "@/components/properties/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormSelectField, toStringOptions } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_PROPERTY_FORM, propertyRowToForm } from "@/features/properties/lib/property-form";
import type { PropertyListRow } from "@/components/properties/types";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { PROPERTY_TYPES, propertyFormSchema, type PropertyFormInput } from "@/lib/validations";

const LABEL_CLASS = "text-app-xs font-semibold text-muted-foreground";
const FIELD_CLASS =
  "h-11 w-full rounded-xl border border-foreground/25 bg-background px-3.5 text-sm shadow-sm outline-none md:h-12 md:px-4 md:text-base focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25";

type Props = {
  open: boolean;
  /** The venue being edited, or null when creating a new one. */
  row: PropertyListRow | null;
  onClose: () => void;
  onSubmit: (data: PropertyFormInput) => Promise<void>;
};

/** Create/edit dialog for one venue. The form resets every time the dialog opens. */
export function PropertyFormDialog({ open, row, onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  const form = useForm<PropertyFormInput>({
    resolver: zodResolver(propertyFormSchema) as Resolver<PropertyFormInput>,
    defaultValues: EMPTY_PROPERTY_FORM,
  });
  const { register, setValue, control, reset, formState } = form;
  const errors = formState.errors;
  const idPrefix = row ? "edit" : "add";

  useEffect(() => {
    if (open) reset(row ? propertyRowToForm(row) : EMPTY_PROPERTY_FORM);
  }, [open, row, reset]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !formState.isSubmitting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold">
            {row ? t("properties.editVenue") : t("properties.newVenue")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-name`} className={LABEL_CLASS}>
              {t("common.fields.name")}
            </Label>
            <Input
              id={`${idPrefix}-name`}
              {...register("name")}
              className={FIELD_CLASS}
              placeholder={t("properties.namePlaceholder")}
              aria-invalid={errors.name ? true : undefined}
              autoFocus
            />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-type`} className={LABEL_CLASS}>
              {t("common.fields.type")}
            </Label>
            <FormSelectField
              name="type"
              control={control}
              id={`${idPrefix}-type`}
              className={FIELD_CLASS}
              placeholder={t("properties.typePlaceholder")}
              options={toStringOptions(PROPERTY_TYPES, (type) => propertyTypeLabel(type, t))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-address`} className={LABEL_CLASS}>
              {t("common.fields.address")}
            </Label>
            <AddressField
              id={`${idPrefix}-address`}
              name="address"
              register={register}
              setValue={setValue}
              className={FIELD_CLASS}
              placeholder={t("properties.addressPlaceholder")}
            />
            {errors.address ? <p className="text-xs text-destructive">{errors.address.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-notes`} className={LABEL_CLASS}>
              {t("common.fields.notes")}
            </Label>
            <Textarea
              id={`${idPrefix}-notes`}
              {...register("notes")}
              rows={4}
              className={cn(FIELD_CLASS, "min-h-24 py-3")}
              placeholder={t("properties.notesPlaceholder")}
            />
            {errors.notes ? <p className="text-xs text-destructive">{errors.notes.message}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={formState.isSubmitting}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" variant="success" size="cta" disabled={formState.isSubmitting}>
              {row ? t("common.actions.save") : t("common.actions.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
