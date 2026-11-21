"use client";

import { PropertySelectField } from "@/components/properties/property-select-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fieldClass, labelClass, outlineBtnClass } from "@/features/overnatting/components/form-classes";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { AccommodationUnitFormInput } from "@/lib/validations";
import type { UseFormReturn } from "react-hook-form";

type UnitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  form: UseFormReturn<AccommodationUnitFormInput>;
  onSubmit: (data: AccommodationUnitFormInput) => Promise<void>;
  properties: { id: string; name: string }[];
  rid: string;
};

/** Create or edit an accommodation unit. */
export function UnitDialog({ open, onOpenChange, isEditing, form, onSubmit, properties, rid }: UnitDialogProps) {
  const { t } = useTranslation();
  return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg rounded-2xl border border-foreground/10" showCloseButton>
      <DialogHeader>
        <DialogTitle className="font-heading">
          {isEditing ? t("overnatting.editUnit") : t("overnatting.newUnitTitle")}
        </DialogTitle>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit(onSubmit)();
        }}
      >
        <div className="space-y-2">
          <Label className={labelClass} htmlFor={`${rid}-uname`}>
            {t("common.fields.name")}
          </Label>
          <Input
            id={`${rid}-uname`}
            className={fieldClass}
            {...form.register("name")}
          />
          {form.formState.errors.name ? (
            <p className="text-app-sm text-destructive">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label className={labelClass} htmlFor={`${rid}-p`}>
            {t("overnatting.propertyOptional")}
          </Label>
          <PropertySelectField
            name="propertyId"
            control={form.control}
            id={`${rid}-p`}
            className={cn(fieldClass, "font-medium")}
            optional
            placeholder={t("overnatting.noPropertyLink")}
            properties={properties}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className={labelClass} htmlFor={`${rid}-mg`}>
              {t("overnatting.maxGuestsLabel")}
            </Label>
            <Input
              id={`${rid}-mg`}
              type="number"
              min={1}
              className={fieldClass}
              {...form.register("maxGuests")}
            />
            {form.formState.errors.maxGuests ? (
              <p className="text-app-sm text-destructive">
                {form.formState.errors.maxGuests.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label className={labelClass} htmlFor={`${rid}-so`}>
              {t("overnatting.sortOrder")}
            </Label>
            <Input
              id={`${rid}-so`}
              type="number"
              min={0}
              className={fieldClass}
              {...form.register("sortOrder")}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className={labelClass} htmlFor={`${rid}-unote`}>
            {t("common.fields.notes")}
          </Label>
          <Textarea
            id={`${rid}-unote`}
            className="rounded-xl border border-foreground/25 bg-background p-3 shadow-none focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20"
            rows={2}
            {...form.register("notes")}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-app-sm font-medium">
          <input
            type="checkbox"
            className="size-5 rounded-md border border-foreground/40 accent-success"
            {...form.register("active")}
          />
          {t("overnatting.activeForBooking")}
        </label>
        <DialogFooter className="gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className={outlineBtnClass}
            onClick={() => onOpenChange(false)}
          >
            {t("common.actions.cancel")}
          </Button>
          <Button type="submit" variant="success" className="rounded-xl shadow-none">
            {t("common.actions.save")}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
  );
}
