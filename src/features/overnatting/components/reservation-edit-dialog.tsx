"use client";

import { DatePickerField } from "@/components/ui/date-picker-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormSelectField, toStringOptions } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceInput } from "@/components/ui/price-input";
import { Textarea } from "@/components/ui/textarea";
import { dialogSectionTitleClass, fieldClass, labelClass, outlineBtnClass } from "@/features/overnatting/components/form-classes";
import { UNKNOWN_CUSTOMER, type AccommodationReservationRow, type AccommodationUnitRow } from "@/features/overnatting/types";
import { useTranslation } from "@/i18n/client";
import { statusLabel } from "@/lib/navigation/nav-labels";
import { RN_MODAL_FOOTER, RN_MODAL_MAX_HEIGHT, RN_MODAL_SCROLL_BODY } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import {
  ACCOMMODATION_RESERVATION_STATUSES,
  type AccommodationReservationEditInput,
  type AccommodationReservationStatus,
} from "@/lib/validations";
import { Controller, type UseFormReturn } from "react-hook-form";

type ReservationEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: AccommodationReservationRow | null;
  form: UseFormReturn<AccommodationReservationEditInput>;
  onSubmit: (data: AccommodationReservationEditInput) => Promise<void>;
  onDeleteClick: () => void;
  units: AccommodationUnitRow[];
  rid: string;
};

/** Edit one reservation (unit, dates, times, guests, status, price, notes). */
export function ReservationEditDialog({
  open,
  onOpenChange,
  reservation,
  form,
  onSubmit,
  onDeleteClick,
  units,
  rid,
}: ReservationEditDialogProps) {
  const { t } = useTranslation();
  return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className={cn(
        "max-w-lg gap-0 overflow-hidden rounded-2xl border border-foreground/10 p-0 sm:max-w-xl",
        RN_MODAL_MAX_HEIGHT,
        "flex flex-col",
      )}
      showCloseButton
    >
      <DialogHeader className="shrink-0 border-b border-foreground/10 px-6 pb-4 pt-6 sm:px-8">
        <DialogTitle className="font-heading text-app-lg md:text-app-xl">
          {t("overnatting.editReservation")}
        </DialogTitle>
      </DialogHeader>
      {reservation ? (
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit(onSubmit)();
          }}
        >
          <div className={cn(RN_MODAL_SCROLL_BODY, "space-y-5 px-6 py-5 sm:px-8")}>
            <div className="rounded-xl bg-muted/50 px-4 py-3">
              <p className={dialogSectionTitleClass}>{t("overnatting.customerSection")}</p>
              <p className="mt-1 font-heading text-app-base font-semibold text-rn-text-heading">
                {reservation.customerName === UNKNOWN_CUSTOMER
                  ? t("overnatting.unknownCustomer")
                  : reservation.customerName}
              </p>
            </div>

            <div className="space-y-2">
              <Label className={labelClass} htmlFor={`${rid}-erun`}>
                {t("overnatting.tableUnit")}
              </Label>
              <FormSelectField
                name="unitId"
                control={form.control}
                id={`${rid}-erun`}
                className={cn(fieldClass, "font-medium")}
                options={units.map((u) => ({
                  value: u.id,
                  label: t("overnatting.unitMaxGuests", {
                    name: u.name,
                    count: u.maxGuests,
                  }),
                }))}
              />
              {form.formState.errors.unitId ? (
                <p className="text-app-sm text-destructive">
                  {form.formState.errors.unitId.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-3 rounded-xl bg-muted/50 p-4 sm:p-5">
              <div className="space-y-1">
                <p className={dialogSectionTitleClass}>{t("overnatting.timeSection")}</p>
                <p className="text-app-xs leading-snug text-muted-foreground">
                  {t("overnatting.timeSectionHint")}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className={labelClass} htmlFor={`${rid}-ercid`}>
                    {t("overnatting.tableArrival")}
                  </Label>
                  <Controller
                    name="checkInDate"
                    control={form.control}
                    render={({ field }) => (
                      <DatePickerField
                        id={`${rid}-ercid`}
                        variant="toolbar"
                        className={fieldClass}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {form.formState.errors.checkInDate ? (
                    <p className="text-app-sm text-destructive">
                      {form.formState.errors.checkInDate.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label className={labelClass} htmlFor={`${rid}-ercod`}>
                    {t("overnatting.tableDeparture")}
                  </Label>
                  <Controller
                    name="checkOutDate"
                    control={form.control}
                    render={({ field }) => (
                      <DatePickerField
                        id={`${rid}-ercod`}
                        variant="toolbar"
                        className={fieldClass}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {form.formState.errors.checkOutDate ? (
                    <p className="text-app-sm text-destructive">
                      {form.formState.errors.checkOutDate.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label className={labelClass} htmlFor={`${rid}-ercit`}>
                    {t("overnatting.checkIn")}{" "}
                    <span className="font-normal normal-case text-muted-foreground">
                      {t("overnatting.optional")}
                    </span>
                  </Label>
                  <Input
                    id={`${rid}-ercit`}
                    type="time"
                    step={60}
                    className={fieldClass}
                    {...form.register("checkInTime")}
                  />
                  {form.formState.errors.checkInTime ? (
                    <p className="text-app-sm text-destructive">
                      {form.formState.errors.checkInTime.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label className={labelClass} htmlFor={`${rid}-ercot`}>
                    {t("overnatting.checkOut")}{" "}
                    <span className="font-normal normal-case text-muted-foreground">
                      {t("overnatting.optional")}
                    </span>
                  </Label>
                  <Input
                    id={`${rid}-ercot`}
                    type="time"
                    step={60}
                    className={fieldClass}
                    {...form.register("checkOutTime")}
                  />
                  {form.formState.errors.checkOutTime ? (
                    <p className="text-app-sm text-destructive">
                      {form.formState.errors.checkOutTime.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={labelClass} htmlFor={`${rid}-rg`}>
                  {t("overnatting.tableGuests")}
                </Label>
                <Input
                  id={`${rid}-rg`}
                  type="number"
                  min={1}
                  className={fieldClass}
                  {...form.register("guestCount")}
                />
                {form.formState.errors.guestCount ? (
                  <p className="text-app-sm text-destructive">
                    {form.formState.errors.guestCount.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label className={labelClass} htmlFor={`${rid}-rst`}>
                  {t("common.fields.status")}
                </Label>
                <FormSelectField
                  name="status"
                  control={form.control}
                  id={`${rid}-rst`}
                  className={cn(fieldClass, "font-medium")}
                  options={toStringOptions(
                    ACCOMMODATION_RESERVATION_STATUSES,
                    (s) => statusLabel(s as AccommodationReservationStatus, t),
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className={labelClass} htmlFor={`${rid}-rp`}>
                {t("overnatting.totalPriceOptional")}{" "}
                <span className="font-normal normal-case text-muted-foreground">
                  {t("overnatting.optional")}
                </span>
              </Label>
              <PriceInput
                id={`${rid}-rp`}
                step="0.01"
                className={fieldClass}
                {...form.register("totalPrice")}
              />
              {form.formState.errors.totalPrice ? (
                <p className="text-app-sm text-destructive">
                  {form.formState.errors.totalPrice.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className={labelClass} htmlFor={`${rid}-rn`}>
                {t("common.fields.notes")}
              </Label>
              <Textarea
                id={`${rid}-rn`}
                rows={3}
                className="rounded-xl border border-foreground/25 bg-background p-3 text-app-sm shadow-none focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20 md:text-app-base"
                {...form.register("notes")}
              />
            </div>
          </div>

          <DialogFooter
            className={cn(
              RN_MODAL_FOOTER,
              "mx-0 mb-0 mt-0 flex flex-col gap-3 rounded-b-[length:var(--app-radius)] border-t border-foreground/10 bg-card px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-8 sm:py-4",
            )}
          >
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => onDeleteClick()}
            >
              {t("overnatting.deleteReservation")}
            </Button>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className={cn("w-full sm:w-auto", outlineBtnClass)}
                onClick={() => onOpenChange(false)}
              >
                {t("common.actions.cancel")}
              </Button>
              <Button
                type="submit"
                variant="success"
                className="w-full rounded-xl shadow-none sm:w-auto"
                disabled={form.formState.isSubmitting}
              >
                {t("common.actions.save")}
              </Button>
            </div>
          </DialogFooter>
        </form>
      ) : null}
    </DialogContent>
  </Dialog>
  );
}
