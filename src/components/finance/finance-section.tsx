"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { AppPageHeader } from "@/components/layout/app-page-header";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import {
  transactionFormSchema,
  type TransactionFormInput,
} from "@/lib/validations";
import { isIncomeTransactionType as rowIsIncome } from "@/lib/transaction-income";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  MinusCircle,
  Pencil,
  Plus,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import type { TransactionListItem } from "./types";

const financeTableHeadClass =
  "px-6 py-4 text-sm font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5 md:text-base";
const financeTableCellClass = "px-6 py-5 md:px-8 md:py-6";
const filterControlClass =
  "flex h-12 w-full rounded-xl border-2 border-rn-border-strong bg-card px-4 text-base font-medium focus-visible:border-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/25";

export type FinanceSectionProps = {
  transactions: TransactionListItem[];
  properties: { id: string; name: string }[];
  loadError: string | null;
  /** Server-derived: owner, admin, or accountant */
  canManageTransactions: boolean;
};

const PAGE_SIZE = 20;

const CATEGORY_SUGGESTIONS = [
  "Inntekt",
  "Leie",
  "Depositum",
  "Parkering",
  "Vedlikehold",
  "Skatt",
  "Forsikring",
  "Honorar",
  "Annet",
];

/** Calendar date in local timezone (avoids UTC drift from toISOString). */
function toLocalYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: toLocalYmd(start), to: toLocalYmd(now) };
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

function formatNok(n: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDisplayDate(iso: string) {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
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

function downloadTransactionsCsv(rows: TransactionListItem[]) {
  const headers = [
    "Dato",
    "Lokale",
    "Beskrivelse",
    "Kategori",
    "Type",
    "Beløp",
  ];
  const lines = rows.map((r) =>
    [
      r.transaction_date,
      r.propertyName ?? "",
      r.description ?? "",
      r.category,
      rowIsIncome(r.type) ? "inntekt" : "utgift",
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
  a.download = `transaksjoner-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function transactionFormDefaults(
  properties: { id: string; name: string }[],
  existing: TransactionListItem | null,
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
    category: "Inntekt",
    description: "",
    amount: 0,
    transactionDate: toLocalYmd(new Date()),
  };
}

function TransactionFormInner({
  properties,
  existing = null,
  onClose,
}: {
  properties: { id: string; name: string }[];
  existing?: TransactionListItem | null;
  onClose: () => void;
}) {
  const supabase = useSupabase();
  const router = useRouter();
  const isEdit = existing != null;
  const categoryListId = isEdit
    ? `finance-categories-${existing.id}`
    : "finance-categories-new";

  const form = useForm<TransactionFormInput>({
    resolver: zodResolver(
      transactionFormSchema,
    ) as Resolver<TransactionFormInput>,
    defaultValues: transactionFormDefaults(properties, existing ?? null),
  });

  const { register, handleSubmit, formState } = form;

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
        toast.error("Kunne ikke oppdatere transaksjon", {
          description: error.message,
        });
        return;
      }
      toast.success("Transaksjon oppdatert");
    } else {
      const { error } = await supabase.from("transactions").insert(payload);
      if (error) {
        toast.error("Kunne ikke registrere transaksjon", {
          description: error.message,
        });
        return;
      }
      toast.success("Transaksjon lagret");
    }

    onClose();
    router.refresh();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-heading text-xl font-bold text-rn-text-heading md:text-2xl">
          {isEdit ? "Rediger transaksjon" : "Ny transaksjon"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>Lokale</Label>
          <select
            className={cn(filterControlClass, "appearance-none bg-background pr-10")}
            aria-label="Lokale for transaksjonen"
            {...register("propertyId")}
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {formState.errors.propertyId ? (
            <p className="text-xs text-destructive">
              {formState.errors.propertyId.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <select
            className={cn(filterControlClass, "appearance-none bg-background pr-10")}
            aria-label="Type transaksjon"
            {...register("type")}
          >
            <option value="income">Inntekt</option>
            <option value="expense">Utgift</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Kategori</Label>
          <Input
            className="h-12 rounded-xl border-2 border-rn-border-strong text-base focus-visible:border-success focus-visible:ring-success/25"
            list={categoryListId}
            {...register("category")}
          />
          <datalist id={categoryListId}>
            {CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {formState.errors.category ? (
            <p className="text-xs text-destructive">
              {formState.errors.category.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Beskrivelse</Label>
          <Input
            className="h-12 rounded-xl border-2 border-rn-border-strong text-base focus-visible:border-success focus-visible:ring-success/25"
            placeholder="Valgfritt"
            {...register("description")}
          />
        </div>
        <div className="space-y-2">
          <Label>Beløp (NOK)</Label>
          <Input
            className="h-12 rounded-xl border-2 border-rn-border-strong text-base focus-visible:border-success focus-visible:ring-success/25"
            type="number"
            min={0}
            step={1}
            {...register("amount")}
          />
          {formState.errors.amount ? (
            <p className="text-xs text-destructive">
              {formState.errors.amount.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Dato</Label>
          <Input
            className="h-12 rounded-xl border-2 border-rn-border-strong text-base focus-visible:border-success focus-visible:ring-success/25"
            type="date"
            {...register("transactionDate")}
          />
          {formState.errors.transactionDate ? (
            <p className="text-xs text-destructive">
              {formState.errors.transactionDate.message}
            </p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl border-2 border-rn-border-strong px-6 text-base font-semibold"
            onClick={onClose}
          >
            Avbryt
          </Button>
          <Button
            type="submit"
            className="h-12 rounded-xl border-2 border-rn-accent-border bg-success px-6 font-heading text-base font-bold text-white hover:bg-rn-accent-fill-hover"
          >
            {isEdit ? "Oppdater" : "Lagre"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function FinanceSection({
  transactions,
  properties,
  loadError,
  canManageTransactions,
}: FinanceSectionProps) {
  const [range, setRange] = useState(defaultMonthRange);
  const [propertyId, setPropertyId] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<TransactionListItem | null>(null);

  const setDateFrom = useCallback((from: string) => {
    setRange((r) => ({ ...r, from }));
    setPage(1);
  }, []);
  const setDateTo = useCallback((to: string) => {
    setRange((r) => ({ ...r, to }));
    setPage(1);
  }, []);

  const period = useMemo(() => {
    if (range.from <= range.to) return { from: range.from, to: range.to };
    return { from: range.to, to: range.from };
  }, [range.from, range.to]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (propertyId && t.property_id !== propertyId) return false;
      if (
        t.transaction_date < period.from ||
        t.transaction_date > period.to
      ) {
        return false;
      }
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
    const { prevStart, prevEnd } = previousPeriodBounds(period.from, period.to);
    const prevRows = transactions.filter((t) => {
      if (propertyId && t.property_id !== propertyId) return false;
      return (
        t.transaction_date >= prevStart && t.transaction_date <= prevEnd
      );
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

  const kpiCard = cn(
    "flex flex-col justify-between p-6",
    RN_CARD_SHELL,
  );

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 pb-24 md:pb-8">
      <AppPageHeader
        title="Finans"
        description="Inntekter, utgifter og transaksjoner per lokale og periode."
        actions={
          <Button
            type="button"
            onClick={() => setAddOpen(true)}
            disabled={!canManageTransactions || properties.length === 0}
            title={
              !canManageTransactions
                ? "Krever eier-, admin- eller regnskapstilgang"
                : properties.length === 0
                  ? "Legg til lokaler først"
                  : undefined
            }
            className={cn(
              buttonVariants({ variant: "default" }),
              "h-12 gap-2 rounded-xl border-2 border-rn-accent-border bg-success px-6 font-heading text-base font-bold text-white shadow-md hover:bg-rn-accent-fill-hover",
            )}
          >
            <Plus className="size-5" aria-hidden />
            Ny transaksjon
          </Button>
        }
      />

      {loadError ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive md:text-base"
          role="alert"
        >
          Kunne ikke laste data: {loadError}
        </div>
      ) : null}

      {!loadError && properties.length === 0 ? (
        <div
          className="rounded-xl border-2 border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 md:text-base dark:text-amber-50"
          role="status"
        >
          Ingen lokaler er registrert. Uten lokale kan du ikke knytte transaksjoner.
          {" "}
          <Link
            href="/app/assets"
            className="font-semibold text-success underline underline-offset-2"
          >
            Åpne Aktiva
          </Link>
          {" "}for å legge til lokaler.
        </div>
      ) : null}

      <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
        <section className="flex flex-wrap items-end gap-4 px-6 py-5 md:gap-5 md:px-8 md:py-6">
        <div className="min-w-[200px] flex-1 space-y-2">
          <Label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase md:text-xs">
            Lokale
          </Label>
          <select
            value={propertyId}
            onChange={(e) => {
              setPropertyId(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrer transaksjoner etter lokale"
            className={filterControlClass}
          >
            <option value="">Alle lokaler</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px] flex-1 space-y-2">
          <Label
            htmlFor="finance-filter-from"
            className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase md:text-xs"
          >
            Fra dato
          </Label>
          <DatePickerField
            id="finance-filter-from"
            value={range.from}
            onChange={setDateFrom}
            variant="toolbar"
            className="h-12 text-base"
          />
        </div>
        <div className="min-w-[160px] flex-1 space-y-2">
          <Label
            htmlFor="finance-filter-to"
            className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase md:text-xs"
          >
            Til dato
          </Label>
          <DatePickerField
            id="finance-filter-to"
            value={range.to}
            onChange={setDateTo}
            variant="toolbar"
            className="h-12 text-base"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-12 gap-2 rounded-xl border-2 border-rn-border-strong px-5 text-base font-semibold"
          onClick={() => {
            setRange(defaultMonthRange());
            setPropertyId("");
            setPage(1);
          }}
        >
          <Filter className="size-5" aria-hidden />
          Denne måneden
        </Button>
      </section>
      </div>

      {range.from > range.to ? (
        <p className="text-sm text-muted-foreground md:text-base">
          «Til dato» er før «fra dato» — vi viser likevel alle transaksjoner mellom
          disse datoene.
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className={kpiCard}>
          <div className="mb-3 flex items-start justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Inntekter
            </span>
            <TrendingUp
              className="size-9 rounded-lg bg-success/15 p-2 text-success md:size-10"
              aria-hidden
            />
          </div>
          <p className="font-heading text-3xl font-extrabold text-success tabular-nums sm:text-4xl">
            {formatNok(income)}
          </p>
          {comparison.dIncome != null ? (
            <p
              className={cn(
                "mt-3 flex items-center gap-1 text-sm font-semibold md:text-base",
                comparison.dIncome >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {comparison.dIncome >= 0 ? (
                <ArrowUpRight className="size-4 md:size-5" aria-hidden />
              ) : (
                <ArrowDownRight className="size-4 md:size-5" aria-hidden />
              )}
              {Math.abs(comparison.dIncome).toFixed(1)}% vs. forrige periode
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground md:text-base">—</p>
          )}
        </div>

        <div className={kpiCard}>
          <div className="mb-3 flex items-start justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Utgifter
            </span>
            <TrendingDown
              className="size-9 rounded-lg bg-destructive/15 p-2 text-destructive md:size-10"
              aria-hidden
            />
          </div>
          <p className="font-heading text-3xl font-extrabold text-rn-text-heading tabular-nums sm:text-4xl">
            {formatNok(expense)}
          </p>
          {comparison.dExpense != null ? (
            <p
              className={cn(
                "mt-3 flex items-center gap-1 text-sm font-semibold md:text-base",
                comparison.dExpense <= 0 ? "text-success" : "text-destructive",
              )}
            >
              {comparison.dExpense <= 0 ? (
                <ArrowDownRight className="size-4 md:size-5" aria-hidden />
              ) : (
                <ArrowUpRight className="size-4 md:size-5" aria-hidden />
              )}
              {Math.abs(comparison.dExpense).toFixed(1)}% vs. forrige periode
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground md:text-base">—</p>
          )}
        </div>

        <div
          className={cn(
            kpiCard,
            "border-rn-accent-border bg-success text-white shadow-rn-hero-success",
          )}
        >
          <div className="mb-3 flex items-start justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-white/80 uppercase">
              Resultat
            </span>
            <Wallet
              className="size-9 rounded-lg bg-white/10 p-2 text-primary-light md:size-10"
              aria-hidden
            />
          </div>
          <p
            className={cn(
              "font-heading text-3xl font-extrabold tabular-nums sm:text-4xl",
              net >= 0 ? "text-white" : "text-red-200",
            )}
          >
            {net >= 0 ? "+" : ""}
            {formatNok(net)}
          </p>
          {margin != null ? (
            <p className="mt-3 text-sm font-semibold text-primary-light md:text-base">
              Netto margin: {margin.toFixed(1)} %
            </p>
          ) : (
            <p className="mt-3 text-sm text-white/80 md:text-base">Ingen inntekt i perioden</p>
          )}
        </div>
      </section>

      <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
        <div className="flex flex-col gap-3 border-b-2 border-rn-border-strong px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:px-8 md:py-6">
          <h2 className="font-heading text-xl font-bold tracking-tight text-rn-text-heading md:text-2xl">
            Transaksjoner
          </h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="size-12 shrink-0 rounded-xl border-2 border-rn-border-strong"
              onClick={() => downloadTransactionsCsv(filtered)}
              disabled={filtered.length === 0}
              aria-label="Last ned CSV"
            >
              <Download className="size-5" aria-hidden />
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="space-y-3 p-8 text-center text-base text-muted-foreground md:p-10 md:text-lg">
            <p>Ingen transaksjoner i valgt periode.</p>
            {properties.length === 0 ? (
              <p>
                <Link
                  href="/app/assets"
                  className="font-semibold text-success underline underline-offset-2"
                >
                  Registrer lokaler under Aktiva
                </Link>
                {" "}før du kan legge inn transaksjoner.
              </p>
            ) : canManageTransactions ? (
              <p>Bruk «Ny transaksjon» over for å registrere første post.</p>
            ) : (
              <p>Kontakt administrator hvis transaksjoner mangler.</p>
            )}
          </div>
        ) : (
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="border-rn-border-strong/50 bg-rn-surface-table-head hover:bg-rn-surface-table-head">
                <TableHead className={financeTableHeadClass}>Dato</TableHead>
                <TableHead className={financeTableHeadClass}>
                  Beskrivelse
                </TableHead>
                <TableHead className={financeTableHeadClass}>Lokale</TableHead>
                <TableHead className={financeTableHeadClass}>
                  Kategori
                </TableHead>
                <TableHead className={financeTableHeadClass}>Type</TableHead>
                <TableHead
                  className={cn(financeTableHeadClass, "text-right")}
                >
                  Beløp
                </TableHead>
                {canManageTransactions ? (
                  <TableHead className="w-16 px-3 py-4 text-right sm:w-18 md:py-5">
                    <span className="sr-only">Rediger</span>
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
                        "text-sm tabular-nums text-foreground md:text-base",
                      )}
                    >
                      {formatDisplayDate(r.transaction_date)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        financeTableCellClass,
                        "max-w-[220px] text-base font-semibold text-rn-text-heading md:text-lg",
                      )}
                    >
                      <span className="line-clamp-2">
                        {r.description?.trim() || "—"}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        financeTableCellClass,
                        "text-sm text-muted-foreground md:text-base",
                      )}
                    >
                      {r.propertyName ?? "—"}
                    </TableCell>
                    <TableCell className={financeTableCellClass}>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-[11px] font-bold md:text-xs",
                          categoryPillClass(r.category),
                        )}
                      >
                        {r.category}
                      </span>
                    </TableCell>
                    <TableCell className={financeTableCellClass}>
                      <div
                        className={cn(
                          "flex items-center gap-2 text-sm font-semibold md:text-base",
                          inc ? "text-success" : "text-destructive",
                        )}
                      >
                        {inc ? (
                          <PlusCircle className="size-4 shrink-0 md:size-5" aria-hidden />
                        ) : (
                          <MinusCircle className="size-4 shrink-0 md:size-5" aria-hidden />
                        )}
                        {inc ? "Inntekt" : "Utgift"}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        financeTableCellClass,
                        "text-right text-base font-bold tabular-nums md:text-lg",
                        inc ? "text-success" : "text-destructive",
                      )}
                    >
                      <span className="tabular-nums">
                        {inc ? "+" : "−"}
                        {formatNok(Number(r.amount))}
                      </span>
                    </TableCell>
                    {canManageTransactions ? (
                      <TableCell className="w-16 px-3 py-5 text-right sm:w-18 md:px-4 md:py-6">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="size-10 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
                          aria-label={`Rediger transaksjon ${formatDisplayDate(r.transaction_date)}`}
                          onClick={() => setEditRow(r)}
                        >
                          <Pencil className="size-5" aria-hidden />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {filtered.length > 0 ? (
          <div className="flex flex-col gap-3 border-t-2 border-rn-border-strong bg-rn-surface-footer px-6 py-5 text-base font-medium text-rn-footer-text sm:flex-row sm:items-center sm:justify-between md:px-8 md:py-6 md:text-lg">
            <span>
              Viser {pageRows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} av{" "}
              {filtered.length}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 gap-1 rounded-xl border-2 border-rn-border-strong px-4 text-base font-semibold"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-5" aria-hidden />
                Forrige
              </Button>
              <span className="flex items-center px-2 tabular-nums">
                Side {currentPage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                className="h-11 gap-1 rounded-xl border-2 border-rn-border-strong px-4 text-base font-semibold"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Neste
                <ChevronRight className="size-5" aria-hidden />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md rounded-2xl" showCloseButton>
          {addOpen && properties.length > 0 ? (
            <TransactionFormInner
              key="create-transaction"
              properties={properties}
              existing={null}
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
        <DialogContent className="max-w-md rounded-2xl" showCloseButton>
          {editRow && properties.length > 0 ? (
            <TransactionFormInner
              key={editRow.id}
              properties={properties}
              existing={editRow}
              onClose={() => setEditRow(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
