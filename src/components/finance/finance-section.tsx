"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { AppPageHeader } from "@/components/layout/app-page-header";
import {
  Dialog,
  DialogContent,
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
import {
  FormSelect,
  FormSelectField,
  toIdNameOptions,
} from "@/components/ui/form-select";
import { PropertySelectField } from "@/components/properties/property-select-field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RN_SEGMENT_CONTROL, RN_MODAL_FOOTER, RN_MODAL_MAX_HEIGHT, RN_MODAL_SCROLL_BODY } from "@/lib/rn-ui";
import { APP_DATA_BODY, APP_DATA_DATE, APP_DATA_PRIMARY } from "@/lib/table-typography";
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
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  MinusCircle,
  Pencil,
  Plus,
  PlusCircle,
  RotateCcw,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useTranslation } from "@/i18n/client";
import type { Translator } from "@/i18n/types";
import { useCallback, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import type { TransactionListItem } from "./types";

const financeTableHeadClass =
  "finance-table-head px-6 py-4 font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";
const financeTableCellClass = "px-6 py-5 md:px-8 md:py-6";

const txDialogFieldLabel =
  "text-[11px] font-semibold tracking-wider text-muted-foreground uppercase md:text-xs";

export type FinanceSectionProps = {
  transactions: TransactionListItem[];
  properties: { id: string; name: string }[];
  loadError: string | null;
  /** Server-derived: owner, admin, or accountant */
  canManageTransactions: boolean;
};

const PAGE_SIZE = 20;

const FINANCE_CATEGORY_IDS = [
  "income",
  "rent",
  "deposit",
  "parking",
  "maintenance",
  "tax",
  "insurance",
  "fee",
  "other",
] as const;

function financeCategorySuggestions(t: Translator): string[] {
  return FINANCE_CATEGORY_IDS.map((id) => t(`finance.categories.${id}`));
}

/** Calendar date in local timezone (avoids UTC drift from toISOString). */
function toLocalYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Normalize PostgREST `date` or ISO datetime to `yyyy-MM-dd` for string range checks. */
function transactionYmd(isoOrDate: string): string {
  const s = String(isoOrDate ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function mergeRangeWithYmd(
  range: { from: string; to: string },
  ymd: string,
): { from: string; to: string } {
  const y = transactionYmd(ymd);
  if (!y) return range;

  let from = range.from ? transactionYmd(range.from) : "";
  let to = range.to ? transactionYmd(range.to) : "";

  if (!from && !to) return { from: y, to: y };
  if (!from) return { from: y, to };
  if (!to) return { from, to: y };

  if (from > to) [from, to] = [to, from];
  if (y < from) from = y;
  if (y > to) to = y;
  return { from, to };
}

function defaultMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toLocalYmd(start), to: toLocalYmd(end) };
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function previousPeriodBounds(from: string, to: string) {
  const fromD = new Date(`${from}T12:00:00`);
  const toD = new Date(`${to}T12:00:00`);
  const days =
    Math.max(
      1,
      Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1,
    );
  const prevEnd = addDays(from, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  return { prevStart, prevEnd };
}

function formatDisplayDate(iso: string, formatDate: (date: Date | string) => string) {
  return formatDate(`${iso}T12:00:00`);
}

function sumType(rows: TransactionListItem[], income: boolean) {
  return rows.reduce((s, r) => {
    const inc = rowIsIncome(r.type);
    if (inc !== income) return s;
    return s + Number(r.amount);
  }, 0);
}

function pctDelta(prev: number, curr: number): number | null {
  if (prev === 0 && curr === 0) return null;
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function categoryPillClass(category: string) {
  const c = category.toLowerCase();
  if (
    c.includes("inntekt") ||
    c.includes("leie") ||
    c.includes("deposit") ||
    c.includes("park")
  ) {
    return "bg-success/15 text-success";
  }
  if (c.includes("vedlikehold") || c.includes("repar")) {
    return "bg-amber-100/90 text-amber-900";
  }
  if (c.includes("skatt")) {
    return "bg-violet-100/90 text-violet-900";
  }
  return "bg-muted text-muted-foreground";
}

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadTransactionsCsv(rows: TransactionListItem[], t: Translator) {
  const headers = [
    t("finance.csv.date"),
    t("finance.csv.venue"),
    t("finance.csv.description"),
    t("finance.csv.category"),
    t("finance.csv.type"),
    t("finance.csv.amount"),
  ];
  const lines = rows.map((r) =>
    [
      r.transaction_date,
      r.propertyName ?? "",
      r.description ?? "",
      r.category,
      rowIsIncome(r.type) ? t("finance.csv.income") : t("finance.csv.expense"),
      String(r.amount),
    ].map(csvEscape).join(","),
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([`\ufeff${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = t("finance.csv.filename", {
    date: new Date().toISOString().slice(0, 10),
  });
  a.click();
  URL.revokeObjectURL(url);
}

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

function TransactionFormInner({
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
    const payload = {
      property_id: data.propertyId,
      type: data.type,
      category: data.category.trim(),
      description: data.description?.trim() || null,
      amount: data.amount,
      transaction_date: data.transactionDate,
    };

    if (isEdit && existing) {
      const { error } = await supabase
        .from("transactions")
        .update(payload)
        .eq("id", existing.id);
      if (error) {
        toast.error(t("finance.toasts.updateFailed"), {
          description: error.message,
        });
        return;
      }
      toast.success(t("finance.toasts.updated"));
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

      const { error } = await supabase.from("transactions").insert({
        ...payload,
        organization_id: orgId,
      });
      if (error) {
        toast.error(t("finance.toasts.createFailed"), {
          description: error.message,
        });
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
      <div className="shrink-0 border-b border-rn-border-strong/50 px-5 pb-4 pt-5 pr-12 sm:px-8 sm:pt-6 sm:pb-5 sm:pr-14">
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
              className={cn(RN_SEGMENT_CONTROL, "flex w-full gap-1.5 p-1.5")}
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
                  "flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border-2 px-4 py-3 font-heading text-base font-semibold transition-all outline-none sm:min-h-11",
                  txType === "income"
                    ? "border-rn-accent-border bg-success !text-white shadow-md [&_svg]:!text-white"
                    : "border-transparent bg-transparent text-foreground hover:bg-muted/60",
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
                  "flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border-2 px-4 py-3 font-heading text-base font-semibold transition-all outline-none sm:min-h-11",
                  txType === "expense"
                    ? "border-destructive/60 bg-destructive !text-white shadow-md [&_svg]:!text-white"
                    : "border-transparent bg-transparent text-foreground hover:bg-muted/60",
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
                  inputClassName="h-12 rounded-md border-2 border-rn-border-strong pl-12 text-base md:text-base focus-visible:border-success focus-visible:ring-success/25"
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
                    "h-12 rounded-md border-2 bg-background pl-12 text-base font-semibold transition-colors focus-visible:ring-2 md:text-base",
                    txType === "expense"
                      ? "border-destructive/50 focus-visible:border-destructive focus-visible:ring-destructive/20"
                      : "border-rn-border-strong focus-visible:border-success focus-visible:ring-success/25",
                  )}
                  step={1}
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
              className="h-12 rounded-md border-2 border-rn-border-strong text-base md:text-base focus-visible:border-success focus-visible:ring-success/25"
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
              className="h-12 text-base"
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
            "mx-0 mb-0 flex-col-reverse gap-3 border-t-2 border-rn-border-strong bg-rn-surface-footer px-5 py-4 sm:flex-row sm:justify-end sm:px-8 sm:py-5",
          )}
        >
          <Button
            type="button"
            variant="outline"
            size="cta"
            className="w-full border-2 border-rn-border-strong sm:w-auto"
            onClick={onClose}
          >
            {t("common.actions.cancel")}
          </Button>
          <Button
            type="submit"
            variant="success"
            size="cta"
            className="w-full sm:w-auto"
          >
            {isEdit ? t("common.actions.update") : t("finance.saveTransaction")}
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}

const financeToolbarControlClass =
  "box-border h-12 min-h-12 max-h-12 shrink-0 py-0 md:h-14 md:min-h-14 md:max-h-14";

export function FinanceSection({
  transactions,
  properties,
  loadError,
  canManageTransactions,
}: FinanceSectionProps) {
  const { t, formatCurrency, formatDate } = useTranslation();
  const supabase = useSupabase();
  const { invalidateFinance } = useTenantDataInvalidation();
  const [range, setRange] = useState({ from: "", to: "" });
  const [propertyId, setPropertyId] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<TransactionListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransactionListItem | null>(
    null,
  );
  const [deleteBusy, setDeleteBusy] = useState(false);

  const afterTransactionSaved = useCallback(
    (payload: { transactionDate: string; propertyId: string }) => {
      setPage(1);
      setPropertyId((current) =>
        current !== "" && current !== payload.propertyId ? "" : current,
      );
      setRange((r) => mergeRangeWithYmd(r, payload.transactionDate));
    },
    [],
  );

  const setDateFrom = useCallback((from: string) => {
    setRange((r) => ({ ...r, from }));
    setPage(1);
  }, []);
  const setDateTo = useCallback((to: string) => {
    setRange((r) => ({ ...r, to }));
    setPage(1);
  }, []);

  const hasActiveFilters =
    propertyId !== "" || range.from !== "" || range.to !== "";

  const resetFilters = useCallback(() => {
    setRange({ from: "", to: "" });
    setPropertyId("");
    setPage(1);
  }, []);

  const period = useMemo(() => {
    const from = range.from.trim();
    const to = range.to.trim();
    if (!from && !to) return { from: "", to: "" };
    if (from && to) {
      if (from <= to) return { from, to };
      return { from: to, to: from };
    }
    return { from, to };
  }, [range.from, range.to]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (propertyId && t.property_id !== propertyId) return false;
      const d = transactionYmd(t.transaction_date);
      if (period.from && d < period.from) return false;
      if (period.to && d > period.to) return false;
      return true;
    });
  }, [transactions, propertyId, period.from, period.to]);

  const pagination = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    return {
      totalPages,
      currentPage,
      pageRows: filtered.slice(start, start + PAGE_SIZE),
    };
  }, [filtered, page]);

  const comparison = useMemo(() => {
    if (!period.from || !period.to) {
      return {
        prevIncome: 0,
        prevExpense: 0,
        dIncome: null,
        dExpense: null,
      };
    }
    const { prevStart, prevEnd } = previousPeriodBounds(period.from, period.to);
    const prevRows = transactions.filter((t) => {
      if (propertyId && t.property_id !== propertyId) return false;
      const d = transactionYmd(t.transaction_date);
      return d >= prevStart && d <= prevEnd;
    });
    const curIncome = sumType(filtered, true);
    const curExpense = sumType(filtered, false);
    const prevIncome = sumType(prevRows, true);
    const prevExpense = sumType(prevRows, false);
    return {
      prevIncome,
      prevExpense,
      dIncome: pctDelta(prevIncome, curIncome),
      dExpense: pctDelta(prevExpense, curExpense),
    };
  }, [filtered, transactions, propertyId, period.from, period.to]);

  const income = sumType(filtered, true);
  const expense = sumType(filtered, false);
  const net = income - expense;
  const margin = income > 0 ? (net / income) * 100 : null;

  const { totalPages, currentPage, pageRows } = pagination;

  async function confirmDeleteTransaction() {
    const row = deleteTarget;
    if (!row) return;
    setDeleteBusy(true);
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", row.id);

      if (error) {
        toast.error(t("finance.toasts.deleteFailed"), {
          description: error.message,
        });
        return;
      }

      toast.success(t("finance.toasts.deleted"));
      setDeleteTarget(null);
      setEditRow((cur) => (cur?.id === row.id ? null : cur));
      invalidateFinance();
    } finally {
      setDeleteBusy(false);
    }
  }

  const kpiTileClass =
    "flex flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-6 shadow-sm";

  return (
    <div className="mx-auto flex w-full flex-col pb-24 md:pb-8">
      <div className="finance-page-workspace flex w-full flex-col">
      {loadError ? (
        <div
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive md:text-base"
          role="alert"
        >
          {t("finance.loadError", { error: loadError })}
        </div>
      ) : null}
      <AppPageHeader
        className="mb-0"
        title={t("finance.title")}
        actions={
          properties.length === 0 && canManageTransactions ? (
            <Button
              nativeButton={false}
              render={<Link href="/app/settings/lokaler" />}
              className={cn(buttonVariants({ variant: "success", size: "cta" }))}
            >
              <Plus className="size-5" aria-hidden />
              {t("finance.addVenue")}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setAddOpen(true)}
              disabled={!canManageTransactions || properties.length === 0}
              title={
                !canManageTransactions
                  ? t("finance.requiresAccess")
                  : properties.length === 0
                    ? t("finance.addVenuesFirst")
                    : undefined
              }
              className={cn(buttonVariants({ variant: "success", size: "cta" }))}
            >
              <Plus className="size-5" aria-hidden />
              {t("finance.newTransaction")}
            </Button>
          )
        }
        toolbar={
          <>
            <section className="grid w-full min-w-max grid-cols-[minmax(12rem,1fr)_10.5rem_10.5rem_auto] gap-x-4 gap-y-2 md:gap-x-5">
                <Label className="finance-filter-label font-semibold tracking-wider text-muted-foreground uppercase">
                  {t("finance.filterVenue")}
                </Label>
                <Label
                  htmlFor="finance-filter-from"
                  className="finance-filter-label font-semibold tracking-wider text-muted-foreground uppercase"
                >
                  {t("finance.fromDate")}
                </Label>
                <Label
                  htmlFor="finance-filter-to"
                  className="finance-filter-label font-semibold tracking-wider text-muted-foreground uppercase"
                >
                  {t("finance.toDate")}
                </Label>
                <span
                  className="finance-filter-label invisible font-semibold tracking-wider uppercase select-none"
                  aria-hidden
                >
                  &nbsp;
                </span>

                <FormSelect
                  value={propertyId}
                  onValueChange={(v) => {
                    setPropertyId(v);
                    setPage(1);
                  }}
                  aria-label={t("finance.filterVenueAria")}
                  className={cn(
                    "finance-filter-control bg-card",
                    financeToolbarControlClass,
                  )}
                  placeholder={t("finance.allVenues")}
                  options={toIdNameOptions(properties)}
                />
                <DatePickerField
                  id="finance-filter-from"
                  value={range.from}
                  onChange={setDateFrom}
                  maxYmd={range.to || undefined}
                  variant="toolbar"
                  className={cn("finance-date-input", financeToolbarControlClass)}
                />
                <DatePickerField
                  id="finance-filter-to"
                  value={range.to}
                  onChange={setDateTo}
                  minYmd={range.from || undefined}
                  variant="toolbar"
                  className={cn("finance-date-input", financeToolbarControlClass)}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "gap-2 rounded-md border-2 border-rn-border-strong px-5 text-base font-semibold",
                      financeToolbarControlClass,
                    )}
                    onClick={() => {
                      setRange(defaultMonthRange());
                      setPropertyId("");
                      setPage(1);
                    }}
                  >
                    <Filter className="size-5" aria-hidden />
                    {t("finance.thisMonth")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!hasActiveFilters}
                    className={cn(
                      "gap-2 rounded-md border-2 border-rn-border-strong px-5 text-base font-semibold",
                      financeToolbarControlClass,
                    )}
                    onClick={resetFilters}
                  >
                    <RotateCcw className="size-5" aria-hidden />
                    {t("finance.resetFilters")}
                  </Button>
                </div>
              </section>

            {!loadError && properties.length === 0 ? (
              <div
                className="mt-6 border-t border-rn-border-strong/50 pt-6"
                role="status"
              >
                <div className="rounded-md border-2 border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 md:text-base dark:text-amber-50">
                  {t("finance.noVenuesHint")}{" "}
                  <Link
                    href="/app/settings/lokaler"
                    className="font-semibold text-amber-950 underline underline-offset-2 dark:text-amber-50"
                  >
                    {t("finance.registerVenuesLink")}
                  </Link>
                  .
                </div>
              </div>
            ) : null}

            {range.from && range.to && range.from > range.to ? (
              <div className="mt-6 border-t border-rn-border-strong/50 pt-4">
                <p className="finance-range-hint text-muted-foreground">
                  {t("finance.rangeHint")}
                </p>
              </div>
            ) : null}

            <section
              className="mt-6 border-t border-rn-border-strong/50 pt-6 sm:pt-8"
              aria-label={t("finance.kpiAria")}
            >
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
            <div className={kpiTileClass}>
              <div className="mb-3 flex items-start justify-between">
                <span className="finance-kpi-label text-muted-foreground">
                  {t("finance.kpiIncome")}
                </span>
                <TrendingUp
                  className="size-9 rounded-md bg-success/15 p-2 text-success dark:bg-white/10 dark:!text-white md:size-10"
                  aria-hidden
                />
              </div>
              <p className="finance-kpi-value text-success">
                {formatCurrency(income)}
              </p>
              {comparison.dIncome != null ? (
                <p
                  className={cn(
                    "finance-kpi-caption mt-3 flex items-center gap-1 font-semibold",
                    comparison.dIncome >= 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {comparison.dIncome >= 0 ? (
                    <ArrowUpRight className="size-4 md:size-5" aria-hidden />
                  ) : (
                    <ArrowDownRight className="size-4 md:size-5" aria-hidden />
                  )}
                  {t("finance.vsPreviousPeriod", {
                    percent: Math.abs(comparison.dIncome).toFixed(1),
                  })}
                </p>
              ) : (
                <p className="finance-kpi-caption mt-3 text-muted-foreground">
                  —
                </p>
              )}
            </div>

            <div className={kpiTileClass}>
              <div className="mb-3 flex items-start justify-between">
                <span className="finance-kpi-label text-muted-foreground">
                  {t("finance.kpiExpense")}
                </span>
                <TrendingDown
                  className="size-9 rounded-md bg-destructive/15 p-2 text-destructive md:size-10"
                  aria-hidden
                />
              </div>
              <p className="finance-kpi-value text-rn-text-heading">
                {formatCurrency(expense)}
              </p>
              {comparison.dExpense != null ? (
                <p
                  className={cn(
                    "finance-kpi-caption mt-3 flex items-center gap-1 font-semibold",
                    comparison.dExpense <= 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {comparison.dExpense <= 0 ? (
                    <ArrowDownRight className="size-4 md:size-5" aria-hidden />
                  ) : (
                    <ArrowUpRight className="size-4 md:size-5" aria-hidden />
                  )}
                  {t("finance.vsPreviousPeriod", {
                    percent: Math.abs(comparison.dExpense).toFixed(1),
                  })}
                </p>
              ) : (
                <p className="finance-kpi-caption mt-3 text-muted-foreground">
                  —
                </p>
              )}
            </div>

            <div className="flex flex-col justify-between rounded-md border-2 border-rn-accent-border bg-success p-6 text-white shadow-rn-hero-success">
              <div className="mb-3 flex items-start justify-between">
                <span className="finance-kpi-label text-white/80">
                  {t("finance.kpiResult")}
                </span>
                <Wallet
                  className="size-9 rounded-md bg-white/10 p-2 text-primary-light md:size-10"
                  aria-hidden
                />
              </div>
              <p
                className={cn(
                  "finance-kpi-value",
                  net >= 0 ? "text-white" : "text-red-200",
                )}
              >
                {net >= 0 ? "+" : ""}
                {formatCurrency(net)}
              </p>
              {margin != null ? (
                <p className="finance-kpi-caption mt-3 font-semibold text-primary-light">
                  {t("finance.netMargin", { percent: margin.toFixed(1) })}
                </p>
              ) : (
                <p className="finance-kpi-caption mt-3 font-semibold text-white/80">
                  {t("finance.noIncomeInPeriod")}
                </p>
              )}
            </div>
          </div>
            </section>

            <div className="mt-6 border-t border-rn-border-strong/50 pt-6 sm:pt-8">
              <div className="flex flex-col gap-3 border-b-2 border-rn-border-strong pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:pb-6">
                <h2 className="finance-transactions-title app-section-title">
                  {t("finance.transactions")}
                </h2>
                <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="size-12 shrink-0 rounded-md border-2 border-rn-border-strong"
              onClick={() => downloadTransactionsCsv(filtered, t)}
              disabled={filtered.length === 0}
              aria-label={t("finance.downloadCsvAria")}
            >
              <Download className="size-5" aria-hidden />
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="finance-empty-hint space-y-3 p-8 text-center text-muted-foreground md:p-10">
            <p>{t("finance.emptyPeriod")}</p>
            {properties.length === 0 ? (
              <p>
                <Link
                  href="/app/settings/lokaler"
                  className="font-semibold text-success underline underline-offset-2"
                >
                  {t("finance.emptyRegisterVenues")}
                </Link>{" "}
                {t("finance.emptyBeforeTransactions")}
              </p>
            ) : canManageTransactions ? (
              <p>{t("finance.emptyUseNewTransaction")}</p>
            ) : (
              <p>{t("finance.emptyContactAdmin")}</p>
            )}
          </div>
        ) : (
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="border-rn-border-strong/50 bg-rn-surface-table-head hover:bg-rn-surface-table-head">
                <TableHead className={financeTableHeadClass}>{t("finance.tableDate")}</TableHead>
                <TableHead className={financeTableHeadClass}>
                  {t("finance.tableDescription")}
                </TableHead>
                <TableHead className={financeTableHeadClass}>{t("finance.tableVenue")}</TableHead>
                <TableHead className={financeTableHeadClass}>
                  {t("finance.tableCategory")}
                </TableHead>
                <TableHead className={financeTableHeadClass}>{t("finance.tableType")}</TableHead>
                <TableHead
                  className={cn(financeTableHeadClass, "text-right")}
                >
                  {t("finance.tableAmount")}
                </TableHead>
                {canManageTransactions ? (
                  <TableHead className="min-w-[5.5rem] px-3 py-4 text-right sm:min-w-28 md:py-5">
                    <span className="sr-only">{t("finance.editOrDelete")}</span>
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => {
                const inc = rowIsIncome(r.type);
                return (
                  <TableRow
                    key={r.id}
                    className="border-rn-border-strong/40 hover:bg-rn-surface-row-hover"
                  >
                    <TableCell
                      className={cn(
                        financeTableCellClass,
                        APP_DATA_DATE,
                        "finance-row-date",
                      )}
                    >
                      {formatDisplayDate(r.transaction_date, formatDate)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        financeTableCellClass,
                        APP_DATA_PRIMARY,
                        "finance-row-desc max-w-[220px]",
                      )}
                    >
                      <span className="line-clamp-2">
                        {r.description?.trim() || "—"}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        financeTableCellClass,
                        APP_DATA_BODY,
                        "finance-row-meta",
                      )}
                    >
                      {r.propertyName ?? "—"}
                    </TableCell>
                    <TableCell className={financeTableCellClass}>
                      <span
                        className={cn(
                          "finance-category-pill inline-flex rounded-full px-3 py-1 font-bold",
                          categoryPillClass(r.category),
                        )}
                      >
                        {r.category}
                      </span>
                    </TableCell>
                    <TableCell className={financeTableCellClass}>
                      <div
                        className={cn(
                          "finance-row-type flex items-center gap-2 font-semibold",
                          inc ? "text-success" : "text-destructive",
                        )}
                      >
                        {inc ? (
                          <PlusCircle className="size-4 shrink-0 md:size-5" aria-hidden />
                        ) : (
                          <MinusCircle className="size-4 shrink-0 md:size-5" aria-hidden />
                        )}
                        {inc ? t("finance.income") : t("finance.expense")}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        financeTableCellClass,
                        "finance-row-amount text-right font-bold tabular-nums",
                        inc ? "text-success" : "text-destructive",
                      )}
                    >
                      <span className="tabular-nums">
                        {inc ? "+" : "−"}
                        {formatCurrency(Number(r.amount))}
                      </span>
                    </TableCell>
                    {canManageTransactions ? (
                      <TableCell className="min-w-[5.5rem] px-2 py-5 text-right sm:min-w-28 sm:px-3 md:py-6">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-10 shrink-0 rounded-md text-muted-foreground hover:text-foreground"
                            aria-label={t("finance.editTransactionAria", {
                              date: formatDisplayDate(r.transaction_date, formatDate),
                            })}
                            onClick={() => setEditRow(r)}
                          >
                            <Pencil className="size-5" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-10 shrink-0 rounded-md text-destructive hover:bg-destructive/10"
                            aria-label={t("finance.deleteTransactionAria", {
                              date: formatDisplayDate(r.transaction_date, formatDate),
                            })}
                            onClick={() => setDeleteTarget(r)}
                          >
                            <Trash2 className="size-5" aria-hidden />
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {filtered.length > 0 ? (
          <div className="finance-page-footer flex flex-col gap-3 border-t-2 border-rn-border-strong bg-rn-surface-footer px-6 py-5 font-medium text-rn-footer-text sm:flex-row sm:items-center sm:justify-between md:px-8 md:py-6">
            <span>
              {t("finance.footerShowing", {
                from: pageRows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0,
                to: Math.min(currentPage * PAGE_SIZE, filtered.length),
                total: filtered.length,
              })}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 gap-1 rounded-md border-2 border-rn-border-strong px-4 text-base font-semibold"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-5" aria-hidden />
                {t("finance.footerPrev")}
              </Button>
              <span className="flex items-center px-2 tabular-nums">
                {t("finance.footerPageOf", {
                  current: currentPage,
                  total: totalPages,
                })}
              </span>
              <Button
                type="button"
                variant="outline"
                className="h-11 gap-1 rounded-md border-2 border-rn-border-strong px-4 text-base font-semibold"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t("common.actions.next")}
                <ChevronRight className="size-5" aria-hidden />
              </Button>
            </div>
          </div>
        ) : null}
            </div>
            </>
          }
        />
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent
          className={cn(
            "flex w-[calc(100%-1.25rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-md border-2 border-rn-border-strong bg-card p-0 text-foreground shadow-xl sm:max-w-xl",
            RN_MODAL_MAX_HEIGHT,
          )}
          showCloseButton
        >
          {addOpen && properties.length > 0 ? (
            <TransactionFormInner
              key="create-transaction"
              properties={properties}
              existing={null}
              onSaved={afterTransactionSaved}
              onClose={() => setAddOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editRow != null}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
      >
        <DialogContent
          className={cn(
            "flex w-[calc(100%-1.25rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-md border-2 border-rn-border-strong bg-card p-0 text-foreground shadow-xl sm:max-w-xl",
            RN_MODAL_MAX_HEIGHT,
          )}
          showCloseButton
        >
          {editRow && properties.length > 0 ? (
            <TransactionFormInner
              key={editRow.id}
              properties={properties}
              existing={editRow}
              onSaved={afterTransactionSaved}
              onClose={() => setEditRow(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleteBusy) setDeleteTarget(null);
        }}
      >
        <DialogContent
          showCloseButton
          className="max-w-[calc(100%-2rem)] gap-4 rounded-md border-2 border-rn-border-strong bg-card p-6 shadow-xl sm:max-w-md"
        >
          {deleteTarget ? (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="app-card-title">
                  {t("finance.delete.title")}
                </DialogTitle>
                <DialogDescription className="text-app-base leading-relaxed text-muted-foreground">
                  {formatDisplayDate(deleteTarget.transaction_date, formatDate)} ·{" "}
                  {deleteTarget.description?.trim() || t("finance.delete.noDescription")} ·{" "}
                  {rowIsIncome(deleteTarget.type) ? "+" : "−"}
                  {formatCurrency(Number(deleteTarget.amount))}. {t("finance.delete.cannotUndo")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="cta"
                  className="w-full border-2 border-rn-border-strong sm:w-auto"
                  disabled={deleteBusy}
                  onClick={() => setDeleteTarget(null)}
                >
                  {t("common.actions.cancel")}
                </Button>
                <Button
                  type="button"
                  size="cta"
                  disabled={deleteBusy}
                  className="w-full border-2 border-red-200 bg-red-600 !text-white hover:bg-red-700 sm:w-auto"
                  onClick={() => void confirmDeleteTransaction()}
                >
                  {deleteBusy ? t("common.deleting") : t("finance.delete.confirm")}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
