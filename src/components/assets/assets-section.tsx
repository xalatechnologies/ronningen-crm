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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { assetFormSchema, type AssetFormInput } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Armchair,
  Box,
  Building2,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Download,
  MoreVertical,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Snowflake,
  TrendingUp,
  Wrench,
  Wind,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import type { AssetListItem } from "./types";

const assetsTableHeadClass =
  "px-6 py-4 text-sm font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5 md:text-base";
const assetsTableCellClass = "px-6 py-5 md:px-8 md:py-6";
const assetFormControlClass =
  "flex h-12 w-full rounded-xl border-2 border-rn-border-strong bg-background px-4 text-base font-medium focus-visible:border-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/25";

export type AssetsSectionProps = {
  assets: AssetListItem[];
  properties: { id: string; name: string }[];
  loadError: string | null;
  /** Owner/admin from server — avoids client role flash */
  canManageAssets: boolean;
};

const PAGE_SIZE = 20;

const STATUS_QUICK_FILTERS: { id: "all" | StatusBucket; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "operational", label: "I drift" },
  { id: "maintenance", label: "Vedlikehold" },
  { id: "replace", label: "Bytte" },
];

const ICONS = [Package, Armchair, Wind, Coffee, Snowflake, Box] as const;

function assetIconForName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return ICONS[h % ICONS.length]!;
}

function formatNok(n: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

type StatusBucket = "operational" | "maintenance" | "replace";

function statusBucket(condition: string | null): StatusBucket {
  const c = (condition ?? "").toLowerCase();
  if (
    c.includes("utmerket") ||
    c.includes("excellent") ||
    c.includes("god") ||
    c.includes("good") ||
    c.includes("ny") ||
    !c
  ) {
    return "operational";
  }
  if (
    c.includes("fair") ||
    c.includes("akseptabel") ||
    c.includes("middels") ||
    c.includes("vedlikehold") ||
    c.includes("maintenance")
  ) {
    return "maintenance";
  }
  if (
    c.includes("dårlig") ||
    c.includes("poor") ||
    c.includes("bytt") ||
    c.includes("replace") ||
    c.includes("avvik")
  ) {
    return "replace";
  }
  return "maintenance";
}

function conditionPillClass(condition: string | null) {
  const b = statusBucket(condition);
  if (b === "operational")
    return "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
  if (b === "maintenance")
    return "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200";
  return "bg-destructive/15 text-destructive";
}

function insurancePresentation(status: string | null): {
  safeLabel: string;
  tone: "ok" | "warn" | "bad";
} {
  const raw = (status ?? "").trim();
  const s = raw.toLowerCase();
  if (!raw || s === "ukjent") {
    return { safeLabel: "Ukjent", tone: "warn" };
  }
  if (
    s.includes("forsikret") ||
    s.includes("insured") ||
    s.includes("ja") ||
    s === "yes"
  ) {
    return { safeLabel: "Forsikret", tone: "ok" };
  }
  if (
    s.includes("ikke forsikret") ||
    s.includes("not insured") ||
    s.includes("nei") ||
    s === "no"
  ) {
    return { safeLabel: "Ikke forsikret", tone: "bad" };
  }
  return { safeLabel: raw, tone: "warn" };
}

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadAssetsCsv(rows: AssetListItem[]) {
  const headers = [
    "Navn",
    "Lokale",
    "Antall",
    "Verdi (NOK)",
    "Tilstand",
    "Forsikring",
  ];
  const lines = rows.map((a) =>
    [
      a.name,
      a.propertyName ?? "",
      String(a.quantity),
      String(a.value),
      a.condition ?? "",
      a.insurance_status ?? "",
    ].map(csvEscape).join(","),
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([`\ufeff${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const el = document.createElement("a");
  el.href = url;
  el.download = `aktiva-${new Date().toISOString().slice(0, 10)}.csv`;
  el.click();
  URL.revokeObjectURL(url);
}

const CONDITION_PRESETS = [
  { value: "Utmerket", label: "Utmerket" },
  { value: "God", label: "God" },
  { value: "Akseptabel", label: "Akseptabel / vedlikehold" },
  { value: "Dårlig — byttes", label: "Dårlig — skal byttes" },
];

const INSURANCE_PRESETS = [
  { value: "Forsikret", label: "Forsikret" },
  { value: "Ikke forsikret", label: "Ikke forsikret" },
  { value: "Ukjent", label: "Ukjent" },
];

function AssetFormFields({
  properties,
  row,
  onClose,
}: {
  properties: { id: string; name: string }[];
  row: AssetListItem | null;
  onClose: () => void;
}) {
  const supabase = useSupabase();
  const router = useRouter();
  const isEdit = row != null;

  const form = useForm<AssetFormInput>({
    resolver: zodResolver(assetFormSchema) as Resolver<AssetFormInput>,
    defaultValues: {
      propertyId: row?.property_id ?? properties[0]?.id ?? "",
      name: row?.name ?? "",
      quantity: row?.quantity ?? 1,
      value: row?.value ?? 0,
      condition: row?.condition ?? "God",
      insuranceStatus: row?.insurance_status ?? "Ukjent",
    },
  });

  const conditionOptions = useMemo(() => {
    const c = row?.condition?.trim();
    if (c && !CONDITION_PRESETS.some((p) => p.value === c)) {
      return [{ value: c, label: `${c} (lagret)` }, ...CONDITION_PRESETS];
    }
    return CONDITION_PRESETS;
  }, [row?.condition]);

  const insuranceOptions = useMemo(() => {
    const c = row?.insurance_status?.trim();
    if (c && !INSURANCE_PRESETS.some((p) => p.value === c)) {
      return [{ value: c, label: `${c} (lagret)` }, ...INSURANCE_PRESETS];
    }
    return INSURANCE_PRESETS;
  }, [row?.insurance_status]);

  const { register, handleSubmit, formState, setValue, watch } = form;
  const conditionVal = watch("condition");
  const insuranceVal = watch("insuranceStatus");

  async function onSubmit(data: AssetFormInput) {
    const payload = {
      property_id: data.propertyId,
      name: data.name.trim(),
      quantity: data.quantity,
      value: data.value,
      condition: data.condition?.trim() || null,
      insurance_status: data.insuranceStatus?.trim() || null,
    };

    if (isEdit && row) {
      const { error } = await supabase
        .from("assets")
        .update(payload)
        .eq("id", row.id);
      if (error) {
        toast.error("Kunne ikke oppdatere aktivum", {
          description: error.message,
        });
        return;
      }
      toast.success("Aktivum oppdatert");
    } else {
      const { error } = await supabase.from("assets").insert(payload);
      if (error) {
        toast.error("Kunne ikke opprette aktivum", {
          description: error.message,
        });
        return;
      }
      toast.success("Aktivum opprettet");
    }
    onClose();
    router.refresh();
  }

  const title = isEdit ? "Rediger aktivum" : "Nytt aktivum";

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-heading text-xl font-bold text-rn-text-heading md:text-2xl">
          {title}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>Lokale</Label>
          <select
            className={cn(assetFormControlClass, "appearance-none bg-background pr-10")}
            aria-label="Lokale"
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
          <Label>Navn</Label>
          <Input
            className="h-12 rounded-xl border-2 border-rn-border-strong text-base focus-visible:border-success focus-visible:ring-success/25"
            {...register("name")}
          />
          {formState.errors.name ? (
            <p className="text-xs text-destructive">
              {formState.errors.name.message}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Antall</Label>
            <Input
              className="h-12 rounded-xl border-2 border-rn-border-strong text-base focus-visible:border-success focus-visible:ring-success/25"
              type="number"
              min={0}
              {...register("quantity")}
            />
            {formState.errors.quantity ? (
              <p className="text-xs text-destructive">
                {formState.errors.quantity.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Verdi (NOK)</Label>
            <Input
              className="h-12 rounded-xl border-2 border-rn-border-strong text-base focus-visible:border-success focus-visible:ring-success/25"
              type="number"
              min={0}
              step={100}
              {...register("value")}
            />
            {formState.errors.value ? (
              <p className="text-xs text-destructive">
                {formState.errors.value.message}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground md:text-base">
                Total for linjen (ofte antall × enhetsverdi) — brukes i sum og
                forsikringsoversikt.
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Tilstand</Label>
          <select
            className={cn(assetFormControlClass, "appearance-none bg-background pr-10")}
            aria-label="Tilstand"
            value={conditionVal ?? ""}
            onChange={(e) => setValue("condition", e.target.value)}
          >
            {conditionOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Forsikring</Label>
          <select
            className={cn(assetFormControlClass, "appearance-none bg-background pr-10")}
            aria-label="Forsikringsstatus"
            value={insuranceVal ?? ""}
            onChange={(e) => setValue("insuranceStatus", e.target.value)}
          >
            {insuranceOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
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
            {isEdit ? "Lagre" : "Opprett"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function AssetsSection({
  assets,
  properties,
  loadError,
  canManageAssets: canEdit,
}: AssetsSectionProps) {
  const supabase = useSupabase();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | StatusBucket
  >("all");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{
    open: boolean;
    row: AssetListItem | null;
  }>({ open: false, row: null });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (propertyId && a.property_id !== propertyId) return false;
      if (statusFilter !== "all" && statusBucket(a.condition) !== statusFilter) {
        return false;
      }
      if (q) {
        const hay =
          `${a.name} ${a.propertyName ?? ""} ${a.condition ?? ""} ${a.insurance_status ?? ""}`
            .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [assets, query, propertyId, statusFilter]);

  const hasActiveFilters = Boolean(
    query.trim() || propertyId || statusFilter !== "all",
  );

  const filteredStats = useMemo(() => {
    let totalValue = 0;
    let totalUnits = 0;
    for (const a of filtered) {
      totalValue += Number(a.value);
      totalUnits += Number(a.quantity);
    }
    return { totalValue, totalUnits };
  }, [filtered]);

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

  const { totalPages, currentPage, pageRows } = pagination;

  const stats = useMemo(() => {
    let totalValue = 0;
    let totalUnits = 0;
    let insuredValue = 0;
    let insuredRowCount = 0;
    const counts = { operational: 0, maintenance: 0, replace: 0 };
    for (const a of assets) {
      const v = Number(a.value);
      const q = Number(a.quantity);
      totalValue += v;
      totalUnits += q;
      counts[statusBucket(a.condition)] += 1;
      if (insurancePresentation(a.insurance_status).tone === "ok") {
        insuredValue += v;
        insuredRowCount += 1;
      }
    }
    const attentionRows = counts.maintenance + counts.replace;
    const insuredPct =
      totalValue > 0 ? Math.round((insuredValue / totalValue) * 100) : null;
    return {
      totalValue,
      totalUnits,
      counts,
      insuredValue,
      insuredRowCount,
      attentionRows,
      insuredPct,
      rowCount: assets.length,
    };
  }, [assets]);

  const resetFilters = useCallback(() => {
    setPropertyId("");
    setStatusFilter("all");
    setQuery("");
    setPage(1);
  }, []);

  async function deleteAsset(id: string, name: string) {
    if (
      !confirm(
        `Slette «${name}»? Dette kan ikke angres.`,
      )
    ) {
      return;
    }
    const { error } = await supabase.from("assets").delete().eq("id", id);
    if (error) {
      toast.error("Kunne ikke slette", { description: error.message });
      return;
    }
    toast.success("Aktivum slettet");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 pb-24 md:pb-8">
      <AppPageHeader
        title="Aktiva"
        description="Inventar og verdivurdering per lokale — tilstand og forsikring."
        actions={
          <Button
            type="button"
            onClick={() => setDialog({ open: true, row: null })}
            disabled={!canEdit || properties.length === 0}
            title={
              !canEdit
                ? "Krever eier- eller administrator-tilgang"
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
            Nytt aktivum
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
          Det finnes ingen lokaler ennå. Aktiva må knyttes til et lokale — legg inn
          eiendommer i databasen (eller kontakt administrator) før du registrerer
          inventar.
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          className={cn(
            RN_CARD_SHELL,
            "relative flex flex-col justify-between overflow-hidden p-6 md:p-7",
          )}
        >
          <div
            className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-rn-surface-gradient-from opacity-40"
            aria-hidden
          />
          <div className="relative">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase md:text-xs">
              <TrendingUp className="size-4 text-success md:size-5" aria-hidden />
              Total verdi
            </div>
            <p className="font-heading text-3xl font-extrabold text-success tabular-nums sm:text-4xl">
              {formatNok(stats.totalValue)}
            </p>
            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              Summen av «Verdi (NOK)» per rad — ikke antall × enhetspris med mindre du
              legger det inn slik i hver rad.
            </p>
          </div>
          <div className="relative mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-success/25 bg-rn-surface-gradient-from px-3 py-1.5 text-xs font-semibold text-success md:text-sm">
              {stats.rowCount} {stats.rowCount === 1 ? "post" : "poster"}
            </span>
            <span className="rounded-full border border-rn-border-strong/60 bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground md:text-sm">
              {stats.totalUnits} enheter
            </span>
          </div>
          {hasActiveFilters ? (
            <div className="relative mt-3 rounded-xl border border-rn-border-strong/60 bg-muted/30 px-3 py-2 text-sm md:text-base">
              <span className="font-semibold text-rn-text-heading">Utvalg: </span>
              {formatNok(filteredStats.totalValue)}
              <span className="text-muted-foreground"> · </span>
              {filteredStats.totalUnits} enheter
              <span className="text-muted-foreground">
                {" "}
                ({filtered.length}{" "}
                {filtered.length === 1 ? "post" : "poster"})
              </span>
            </div>
          ) : null}
        </div>

        <div className={cn(RN_CARD_SHELL, "flex flex-col gap-4 p-6 md:p-7")}>
          <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase md:text-xs">
            Tilstand
          </h3>
          <div className="space-y-3 text-sm md:text-base">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="size-2.5 shrink-0 rounded-full bg-emerald-500 md:size-3"
                  aria-hidden
                />
                I drift
              </span>
              <span className="font-heading text-xl font-bold text-foreground tabular-nums md:text-2xl">
                {stats.counts.operational}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="size-2.5 shrink-0 rounded-full bg-amber-500 md:size-3"
                  aria-hidden
                />
                Vedlikehold
              </span>
              <span className="font-heading text-xl font-bold text-foreground tabular-nums md:text-2xl">
                {stats.counts.maintenance}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="size-2.5 shrink-0 rounded-full bg-red-500 md:size-3"
                  aria-hidden
                />
                Bytte
              </span>
              <span className="font-heading text-xl font-bold text-foreground tabular-nums md:text-2xl">
                {stats.counts.replace}
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-1 h-12 w-full gap-2 rounded-xl border-2 border-rn-border-strong text-base font-semibold"
            onClick={() => {
              setStatusFilter("maintenance");
              setPage(1);
            }}
          >
            <Wrench className="size-5" aria-hidden />
            Vis vedlikehold
          </Button>
        </div>

        <div className={cn(RN_CARD_SHELL, "flex flex-col gap-3 p-6 md:p-7")}>
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase md:text-xs">
            <ShieldCheck className="size-4 text-success md:size-5" aria-hidden />
            Forsikring
          </div>
          <p className="font-heading text-3xl font-extrabold text-foreground tabular-nums sm:text-4xl">
            {formatNok(stats.insuredValue)}
          </p>
          <p className="text-sm text-muted-foreground md:text-base">
            {stats.insuredRowCount} av {stats.rowCount}{" "}
            {stats.rowCount === 1 ? "linje" : "linjer"} markert som forsikret
            {stats.insuredPct != null ? (
              <>
                {" "}
                <span className="text-foreground">({stats.insuredPct}% av verdi)</span>
              </>
            ) : null}
          </p>
        </div>

        <div
          className={cn(
            RN_CARD_SHELL,
            "flex flex-col justify-between gap-4 p-6 md:p-7",
            stats.attentionRows > 0 &&
              "border-2 border-amber-500/45 bg-amber-500/[0.07]",
          )}
        >
          <div>
            <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase md:text-xs">
              Oppfølging
            </h3>
            {stats.attentionRows > 0 ? (
              <p className="mt-3 text-base text-foreground md:text-lg">
                <span className="font-heading text-3xl font-bold tabular-nums text-amber-900 sm:text-4xl dark:text-amber-100">
                  {stats.attentionRows}
                </span>{" "}
                aktiva trenger vedlikehold eller utskifting.
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground md:text-base">
                Ingen aktiva er markert som vedlikehold eller bytte.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl border-2 border-rn-border-strong text-base font-semibold"
              onClick={() => {
                setStatusFilter("replace");
                setPage(1);
              }}
            >
              Vis bytteliste
            </Button>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                className="h-12 rounded-xl text-base font-medium text-muted-foreground hover:text-foreground"
                onClick={resetFilters}
              >
                Nullstill filtre
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section
        className={cn(
          "overflow-hidden",
          RN_CARD_SHELL,
        )}
      >
        <div className="flex flex-nowrap items-center gap-3 overflow-x-auto border-b-2 border-rn-border-strong bg-card px-6 py-5 sm:gap-4 md:px-8 md:py-6">
          <div className="flex shrink-0 items-baseline gap-2 pr-1">
            <h2 className="font-heading text-xl font-bold whitespace-nowrap text-rn-text-heading md:text-2xl">
              Inventar
            </h2>
            {assets.length === 0 ? (
              <span className="hidden text-base text-muted-foreground sm:inline md:text-lg">
                Ingen data
              </span>
            ) : (
              <span className="text-base whitespace-nowrap text-muted-foreground md:text-lg">
                <span className="font-semibold text-foreground">
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "post" : "poster"}
                </span>
                {hasActiveFilters ? (
                  <span>
                    {" "}
                    <span className="text-muted-foreground">
                      av {assets.length}
                    </span>
                  </span>
                ) : null}
              </span>
            )}
          </div>

          <div className="relative min-w-40 flex-1 basis-48">
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Søk …"
              title="Søk i navn, lokale, tilstand eller forsikring"
              className="h-12 rounded-xl border-2 border-rn-border-strong bg-background pl-12 text-base focus-visible:border-success focus-visible:ring-success/25"
              aria-label="Søk i inventar"
            />
          </div>

          <div className="relative w-[min(100%,16rem)] shrink-0 sm:w-56">
            <Building2
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <select
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setPage(1);
              }}
              aria-label="Filtrer etter lokale"
              className="h-12 w-full min-w-0 cursor-pointer rounded-xl border-2 border-rn-border-strong bg-background py-0 pr-4 pl-12 text-base font-medium focus-visible:border-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/25"
            >
              <option value="">Alle lokaler</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="size-12 shrink-0 rounded-xl border-2 border-rn-border-strong"
              disabled={filtered.length === 0}
              onClick={() => downloadAssetsCsv(filtered)}
              aria-label="Last ned synlige rader som CSV"
              title="Last ned CSV"
            >
              <Download className="size-5" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 whitespace-nowrap rounded-xl border-2 border-rn-border-strong px-4 text-base font-semibold"
              disabled={!hasActiveFilters}
              title={
                hasActiveFilters
                  ? "Fjern søk, lokalefilter og tilstandsfilter"
                  : "Ingen aktive filtre"
              }
              onClick={resetFilters}
            >
              Nullstill filter
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b-2 border-rn-border-strong bg-muted/25 px-6 py-4 sm:gap-3 md:px-8 md:py-5">
          <span className="mr-1 shrink-0 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase md:text-xs">
            Tilstand
          </span>
          {STATUS_QUICK_FILTERS.map((opt) => (
            <Button
              key={opt.id}
              type="button"
              variant={statusFilter === opt.id ? "default" : "outline"}
              className={cn(
                "h-11 rounded-xl border-2 px-4 text-sm font-semibold md:h-12 md:text-base",
                statusFilter === opt.id
                  ? "border-rn-accent-border bg-success text-white hover:bg-rn-accent-fill-hover"
                  : "border-rn-border-strong",
              )}
              onClick={() => {
                setStatusFilter(opt.id);
                setPage(1);
              }}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center md:gap-5 md:px-8 md:py-20">
            <div
              className="flex size-16 items-center justify-center rounded-2xl border-2 border-rn-border-strong bg-muted/40 md:size-18"
              aria-hidden
            >
              <Package className="size-8 text-muted-foreground md:size-9" />
            </div>
            <p className="max-w-sm text-base text-muted-foreground md:text-lg">
              {assets.length === 0 ? (
                <>
                  Ingen aktiva i registeret ennå.
                  {canEdit && properties.length > 0 ? (
                    <>
                      {" "}
                      Bruk <span className="font-medium text-foreground">Nytt aktivum</span>{" "}
                      over for å legge til inventar.
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  Ingen rader samsvarer med filter eller søk.{" "}
                  <button
                    type="button"
                    className="font-semibold text-success underline underline-offset-2"
                    onClick={resetFilters}
                  >
                    Nullstill filtre
                  </button>
                </>
              )}
            </p>
          </div>
        ) : (
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow className="border-rn-border-strong/50 bg-rn-surface-table-head hover:bg-rn-surface-table-head">
                <TableHead className={assetsTableHeadClass}>Navn</TableHead>
                <TableHead className={assetsTableHeadClass}>Lokale</TableHead>
                <TableHead
                  className={cn(assetsTableHeadClass, "text-center")}
                >
                  Antall
                </TableHead>
                <TableHead className={assetsTableHeadClass}>Verdi</TableHead>
                <TableHead className={assetsTableHeadClass}>Tilstand</TableHead>
                <TableHead className={assetsTableHeadClass}>
                  Forsikring
                </TableHead>
                <TableHead
                  className={cn("w-12 text-right sm:w-14", assetsTableHeadClass)}
                >
                  <span className="sr-only">Handlinger</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((a) => {
                const Icon = assetIconForName(a.name);
                const ins = insurancePresentation(a.insurance_status);
                return (
                  <TableRow
                    key={a.id}
                    onClick={() => {
                      if (canEdit) setDialog({ open: true, row: a });
                    }}
                    className={cn(
                      "border-rn-border-strong/40 hover:bg-rn-surface-row-hover",
                      canEdit && "cursor-pointer",
                    )}
                  >
                    <TableCell className={assetsTableCellClass}>
                      <div className="flex items-center gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-success/20 bg-rn-surface-gradient-from text-success md:size-12">
                          <Icon className="size-5 md:size-6" aria-hidden />
                        </div>
                        <span className="text-base font-semibold text-success md:text-lg">
                          {a.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        assetsTableCellClass,
                        "text-sm text-muted-foreground md:text-base",
                      )}
                    >
                      {a.propertyName ?? "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        assetsTableCellClass,
                        "text-center text-sm font-medium tabular-nums md:text-base",
                      )}
                    >
                      {a.quantity}
                    </TableCell>
                    <TableCell
                      className={cn(
                        assetsTableCellClass,
                        "text-base font-semibold text-success md:text-lg",
                      )}
                    >
                      {formatNok(Number(a.value))}
                    </TableCell>
                    <TableCell className={assetsTableCellClass}>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-[11px] font-bold md:text-xs",
                          conditionPillClass(a.condition),
                        )}
                      >
                        {a.condition?.trim() || "Ikke satt"}
                      </span>
                    </TableCell>
                    <TableCell className={assetsTableCellClass}>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold md:text-xs",
                          ins.tone === "ok" &&
                            "border border-success/25 bg-success/15 text-success",
                          ins.tone === "bad" && "bg-destructive/15 text-destructive",
                          ins.tone === "warn" &&
                            "border border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            ins.tone === "ok" && "bg-emerald-600",
                            ins.tone === "bad" && "bg-destructive",
                            ins.tone === "warn" && "bg-amber-600",
                          )}
                          aria-hidden
                        />
                        {ins.safeLabel}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(assetsTableCellClass, "text-right")}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="size-10 rounded-xl text-muted-foreground md:size-11"
                              aria-label={`Handlinger for ${a.name}`}
                            />
                          }
                        >
                          <MoreVertical className="size-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-36">
                          <DropdownMenuItem
                            disabled={!canEdit}
                            onSelect={() =>
                              setDialog({ open: true, row: a })
                            }
                          >
                            Rediger
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!canEdit}
                            variant="destructive"
                            onSelect={() => void deleteAsset(a.id, a.name)}
                          >
                            Slett
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {filtered.length > 0 ? (
          <div className="flex flex-col gap-3 border-t-2 border-rn-border-strong bg-rn-surface-footer px-6 py-5 text-base text-rn-footer-text sm:flex-row sm:items-center sm:justify-between md:px-8 md:py-6 md:text-lg">
            <span>
              Viser {pageRows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} av{" "}
              {filtered.length}
              {statusFilter !== "all"
                ? ` · status: ${
                    statusFilter === "maintenance"
                      ? "vedlikehold"
                      : statusFilter === "operational"
                        ? "i drift"
                        : "bytte"
                  }`
                : null}
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
      </section>

      <Dialog
        open={dialog.open}
        onOpenChange={(open) => {
          if (!open) setDialog({ open: false, row: null });
          else setDialog((s) => ({ ...s, open: true }));
        }}
      >
        <DialogContent className="max-w-md rounded-2xl" showCloseButton>
          {dialog.open ? (
            properties.length > 0 ? (
              <AssetFormFields
                key={dialog.row?.id ?? "new"}
                properties={properties}
                row={dialog.row}
                onClose={() => setDialog({ open: false, row: null })}
              />
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="font-heading text-xl font-bold text-rn-text-heading md:text-2xl">
                    Kan ikke legge til aktivum
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground md:text-base">
                  Du må ha minst ett lokale registrert før inventar kan knyttes til
                  eiendom.
                </p>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-xl border-2 border-rn-border-strong px-6 text-base font-semibold"
                    onClick={() => setDialog({ open: false, row: null })}
                  >
                    Lukk
                  </Button>
                </DialogFooter>
              </>
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
