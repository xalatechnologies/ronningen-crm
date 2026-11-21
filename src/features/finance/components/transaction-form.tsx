"use client";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AutocompleteFieldController } from "@/components/ui/autocomplete-field";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { Label } from "@/components/ui/label";
import { PropertySelectField } from "@/components/properties/property-select-field";
import { RN_MODAL_FOOTER, RN_MODAL_SCROLL_BODY } from "@/lib/rn-ui";
import {
  transactionFormSchema,
  type TransactionFormInput,
} from "@/lib/validations";
import { isIncomeTransactionType as rowIsIncome } from "@/lib/transaction-income";
import { cn } from "@/lib/utils";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  Tag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useTranslation } from "@/i18n/client";
import type { Translator } from "@/i18n/types";
import { useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import type { TransactionListItem } from "@/features/finance/types";
import { createTransaction, toTransactionPayload, updateTransaction } from "@/features/finance/data/transactions";
import { financeCategorySuggestions } from "@/features/finance/lib/finance-category";
import { toLocalYmd } from "@/features/finance/lib/finance-math";


const txDialogFieldLabel = "text-[13px] font-semibold text-foreground md:text-sm";

const txFieldClass =
  "h-12 rounded-xl border border-foreground/25 bg-background text-base shadow-none hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20 md:text-base";

function transactionFormDefaults(
  properties: { id: string; name: string }[],
  existing: TransactionListItem | null,
  t: Translator,
): TransactionFormInput {
  if (existing) {
    return {
      propertyId: existing.property_id,
      type: rowIsIncome(existing.type) ? "income" : "expense",
      category: existing.category,
      description: existing.description ?? "",
      amount: Number(existing.amount),
      transactionDate: existing.transaction_date,
    };
  }
  return {
    propertyId: properties[0]?.id ?? "",
    type: "income",
    category: t("finance.categories.income"),
    description: "",
    amount: 0,
    transactionDate: toLocalYmd(new Date()),
  };
}

export function TransactionForm({
  properties,
  existing = null,
  onClose,
  onSaved,
}: {
  properties: { id: string; name: string }[];
  existing?: TransactionListItem | null;
  onClose: () => void;
  onSaved?: (payload: {
    transactionDate: string;
    propertyId: string;
  }) => void;
}) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const { invalidateFinance } = useTenantDataInvalidation();
  const isEdit = existing != null;
  const formFieldId = isEdit ? `tx-form-${existing.id}` : "tx-form-new";
  const categorySuggestions = useMemo(
    () => financeCategorySuggestions(t),
    [t],
  );

  const form = useForm<TransactionFormInput>({
    resolver: zodResolver(
      transactionFormSchema,
    ) as Resolver<TransactionFormInput>,
    defaultValues: transactionFormDefaults(properties, existing ?? null, t),
  });

  const { register, control, handleSubmit, formState, setValue, watch } = form;
  const txType = watch("type");
  const transactionDate = watch("transactionDate");
  const hiddenTransactionDateRegister = register("transactionDate");

  async function onSubmit(data: TransactionFormInput) {
    const payload = toTransactionPayload(data);

    if (isEdit && existing) {
      const { error } = await updateTransaction(supabase, existing.id, payload);
      if (error) {
        toast.error(t("finance.toasts.updateFailed"), { description: error.message });
        return;
      }
      toast.success(t("finance.toasts.updated"));
    } else {
      let orgId: string;
      try {
        orgId = requireOrganizationId(currentOrganizationId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("common.toasts.noActiveOrg"));
        return;
      }

      const { error } = await createTransaction(supabase, orgId, payload);
      if (error) {
        toast.error(t("finance.toasts.createFailed"), { description: error.message });
        return;
      }
      toast.success(t("finance.toasts.created"));
    }

    onSaved?.({
      transactionDate: data.transactionDate,
      propertyId: data.propertyId,
    });
    invalidateFinance();
    onClose();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-foreground/10 px-5 pb-4 pt-5 pr-12 sm:px-8 sm:pt-6 sm:pb-5 sm:pr-14">
        <DialogHeader className="gap-2 text-left">
          <DialogTitle className="font-heading text-2xl font-bold tracking-tight text-rn-text-heading">
            {isEdit ? t("finance.editTransaction") : t("finance.newTransaction")}
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-muted-foreground">
            {isEdit ? t("finance.editDescription") : t("finance.newDescription")}
          </DialogDescription>
        </DialogHeader>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className={cn(RN_MODAL_SCROLL_BODY, "space-y-6 px-5 py-6 sm:space-y-7 sm:px-8 sm:py-7")}>
          <div className="space-y-2">
            <Label className={txDialogFieldLabel} htmlFor={`tx-property-${formFieldId}`}>
              {t("finance.filterVenue")}
            </Label>
            <div className="relative">
              {properties.length > 0 ? (
                <Building2
                  className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
              ) : null}
              <PropertySelectField
                name="propertyId"
                control={control}
                id={`tx-property-${formFieldId}`}
                className={properties.length > 0 ? "bg-background py-0 pl-12" : undefined}
                properties={properties}
              />
            </div>
            {formState.errors.propertyId ? (
              <p className="text-sm text-destructive">
                {formState.errors.propertyId.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <span className={cn(txDialogFieldLabel, "block")}>{t("common.fields.type")}</span>
            <div
              className="flex w-full gap-1 rounded-xl bg-muted p-1"
              role="group"
              aria-label={t("finance.transactionTypeAria")}
            >
              <input
                type="radio"
                value="income"
                {...register("type")}
                id={`tx-type-income-${formFieldId}`}
                className="sr-only"
              />
              <label
                htmlFor={`tx-type-income-${formFieldId}`}
                className={cn(
                  "flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-3 font-heading text-base font-semibold transition-colors outline-none sm:min-h-11",
                  txType === "income"
                    ? "bg-success !text-white [&_svg]:!text-white"
                    : "bg-transparent text-foreground hover:bg-card",
                )}
              >
                <TrendingUp className="size-5 shrink-0" aria-hidden />
                {t("finance.income")}
              </label>
              <input
                type="radio"
                value="expense"
                {...register("type")}
                id={`tx-type-expense-${formFieldId}`}
                className="sr-only"
              />
              <label
                htmlFor={`tx-type-expense-${formFieldId}`}
                className={cn(
                  "flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-3 font-heading text-base font-semibold transition-colors outline-none sm:min-h-11",
                  txType === "expense"
                    ? "bg-destructive !text-white [&_svg]:!text-white"
                    : "bg-transparent text-foreground hover:bg-card",
                )}
              >
                <TrendingDown className="size-5 shrink-0" aria-hidden />
                {t("finance.expense")}
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-5">
            <div className="space-y-2 sm:col-span-1">
              <Label className={txDialogFieldLabel} htmlFor={`tx-cat-${formFieldId}`}>
                {t("common.category")}
              </Label>
              <div className="relative">
                <Tag
                  className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <AutocompleteFieldController
                  name="category"
                  control={control}
                  id={`tx-cat-${formFieldId}`}
                  suggestions={categorySuggestions}
                  placeholder={t("finance.categoryPlaceholder")}
                  aria-label={t("finance.categoryAria")}
                  className="w-full"
                  inputClassName={cn(txFieldClass, "pl-12")}
                />
              </div>
              {formState.errors.category ? (
                <p className="text-sm text-destructive">
                  {formState.errors.category.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-1">
              <Label className={txDialogFieldLabel} htmlFor={`tx-amt-${formFieldId}`}>
                {t("finance.amountNok")}
              </Label>
              <div className="relative">
                <Wallet
                  className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <PriceInput
                  className={cn(
                    "h-12 rounded-xl border bg-background pl-12 text-base font-semibold shadow-none transition-colors focus-visible:ring-3 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-base",
                    txType === "expense"
                      ? "border-destructive/50 focus-visible:border-destructive focus-visible:ring-destructive/20"
                      : "border-foreground/25 hover:border-foreground/40 focus-visible:border-success focus-visible:ring-success/20",
                  )}
                  step={1}
                  aria-invalid={!!formState.errors.amount}
                  {...register("amount")}
                  id={`tx-amt-${formFieldId}`}
                />
              </div>
              {formState.errors.amount ? (
                <p className="text-sm text-destructive">
                  {formState.errors.amount.message}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {txType === "expense"
                    ? t("finance.expenseReducesResult")
                    : t("finance.incomeIncreasesResult")}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label
              className={txDialogFieldLabel}
              htmlFor={`tx-desc-${formFieldId}`}
            >
              {t("common.fields.description")}{" "}
              <span className="font-normal normal-case">
                {t("finance.descriptionOptional")}
              </span>
            </Label>
            <Input
              className={txFieldClass}
              placeholder={t("finance.descriptionPlaceholder")}
              {...register("description")}
              id={`tx-desc-${formFieldId}`}
            />
          </div>

          <div className="space-y-2">
            <Label className={txDialogFieldLabel} htmlFor={`tx-date-${formFieldId}`}>
              {t("finance.transactionDate")}
            </Label>
            <DatePickerField
              id={`tx-date-${formFieldId}`}
              value={transactionDate}
              onChange={(ymd) =>
                setValue("transactionDate", ymd, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              variant="toolbar"
              className="h-12 rounded-xl border border-foreground/25 text-base shadow-none"
              aria-invalid={!!formState.errors.transactionDate}
            />
            <input
              type="hidden"
              {...hiddenTransactionDateRegister}
              id={`tx-transactionDate-hidden-${formFieldId}`}
            />
            {formState.errors.transactionDate ? (
              <p className="text-sm text-destructive">
                {formState.errors.transactionDate.message}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter
          className={cn(
            RN_MODAL_FOOTER,
            "mx-0 mb-0 flex-col-reverse gap-3 border-t border-foreground/10 bg-card px-5 py-4 sm:flex-row sm:justify-end sm:px-8 sm:py-5",
          )}
        >
          <Button
            type="button"
            variant="outline"
            size="cta"
            className="w-full rounded-xl border border-foreground/30 bg-card shadow-none hover:bg-muted sm:w-auto"
            onClick={onClose}
          >
            {t("common.actions.cancel")}
          </Button>
          <Button
            type="submit"
            variant="success"
            size="cta"
            className="w-full rounded-xl shadow-none sm:w-auto"
          >
            {isEdit ? t("common.actions.update") : t("finance.saveTransaction")}
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}
