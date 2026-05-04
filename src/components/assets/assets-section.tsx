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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
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
  type AssetStatusBucket,
  assetInsuranceBucket,
  assetRowInsuranceIsCovered,
  assetStatusBucket,
} from "@/lib/asset-status-bucket";
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
  Package,
  Pencil,
  Plus,
  Search,
  Snowflake,
  Trash2,
  Wrench,
  Wind,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useId,
  useMemo,
  useState,
} from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import type { AssetListItem } from "./types";

const assetsTableHeadClass =
  "assets-table-head px-6 py-4 font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";
const assetsTableCellClass = "px-6 py-5 md:px-8 md:py-6";
const assetsKpiStatTileClass =
  "flex flex-col gap-2 rounded-lg border border-rn-border-strong/50 bg-muted/25 px-4 py-3.5 sm:gap-2.5 sm:px-4 sm:py-4 md:px-5 md:py-5";

export type AssetsSectionProps = {
  assets: AssetListItem[];
  properties: { id: string; name: string }[];
  loadError: string | null;
  /** Owner/admin from server — avoids client role flash */
  canManageAssets: boolean;
};

const PAGE_SIZE = 20;

const STATUS_QUICK_FILTERS: { id: "all" | AssetStatusBucket; label: string }[] = [
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

function conditionPillClass(condition: string | null) {
  const b = assetStatusBucket(condition);
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
  const bucket = assetInsuranceBucket(status);
  if (bucket === "covered") {
    return { safeLabel: "Forsikret", tone: "ok" };
  }
  if (bucket === "excluded") {
    return { safeLabel: "Ikke forsikret", tone: "bad" };
  }
  if (bucket === "unknown") {
    return { safeLabel: "Ukjent", tone: "warn" };
  }
  const raw = (status ?? "").replaceAll("\u00a0", " ").trim();
  return { safeLabel: raw || "Ukjent", tone: "warn" };
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
  el.download = `inventar-${new Date().toISOString().slice(0, 10)}.csv`;
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
  suggestedPropertyId,
  onClose,
}: {
  properties: { id: string; name: string }[];
  row: AssetListItem | null;
  /** Når ny rad: forhåndsvelg lokale fra aktiv liste-filter. */
  suggestedPropertyId?: string;
  onClose: () => void;
}) {
  const supabase = useSupabase();
  const router = useRouter();
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
      condition: row?.condition ?? "God",
      insuranceStatus: row?.insurance_status ?? "Ukjent",
    },
  });

  const idProperty = useId();
  const idName = useId();
  const idQty = useId();
  const idValue = useId();
  const idCondition = useId();
  const idInsurance = useId();

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
  const { isSubmitting } = formState;
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
        toast.error("Kunne ikke oppdatere inventarpost", {
          description: error.message,
        });
        return;
      }
      toast.success("Inventarpost oppdatert");
    } else {
      const { error } = await supabase.from("assets").insert(payload);
      if (error) {
        toast.error("Kunne ikke opprette inventarpost", {
          description: error.message,
        });
        return;
      }
      toast.success("Inventarpost opprettet");
    }
    onClose();
    router.refresh();
  }

  const title = isEdit ? "Rediger inventarpost" : "Ny inventarpost";

  return (
    <>
      <DialogHeader className="space-y-0 border-b border-rn-border-strong/60 pb-5 pr-10 text-left sm:pr-12">
        <DialogTitle className="font-heading text-xl font-bold text-rn-text-heading sm:text-2xl">
          {title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isEdit
            ? "Skjema for å oppdatere inventarpost."
            : "Skjema for å registrere ny inventarpost."}
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
              Lokale
            </Label>
            <NativeSelect
              id={idProperty}
              aria-invalid={!!formState.errors.propertyId}
              aria-label="Lokale"
              {...register("propertyId")}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
            {formState.errors.propertyId ? (
              <p className="text-sm text-destructive" role="alert">
                {formState.errors.propertyId.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={idName} className="text-sm font-semibold text-foreground">
              Navn
            </Label>
            <Input
              id={idName}
              aria-invalid={!!formState.errors.name}
              className="h-12 rounded-md border-2 border-rn-border-strong text-base focus-visible:border-success focus-visible:ring-success/25"
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
                Antall
              </Label>
              <Input
                id={idQty}
                aria-invalid={!!formState.errors.quantity}
                className="h-12 rounded-md border-2 border-rn-border-strong text-base tabular-nums focus-visible:border-success focus-visible:ring-success/25"
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
                Verdi{" "}
                <span className="font-normal text-muted-foreground">(NOK)</span>
              </Label>
              <Input
                id={idValue}
                aria-invalid={!!formState.errors.value}
                className="h-12 rounded-md border-2 border-rn-border-strong text-base tabular-nums focus-visible:border-success focus-visible:ring-success/25"
                min={0}
                step={100}
                type="number"
                inputMode="numeric"
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
                Tilstand
              </Label>
              <NativeSelect
                id={idCondition}
                aria-label="Tilstand"
                value={conditionVal ?? ""}
                onChange={(e) => setValue("condition", e.target.value)}
              >
                {conditionOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor={idInsurance}
                className="text-sm font-semibold text-foreground"
              >
                Forsikring
              </Label>
              <NativeSelect
                id={idInsurance}
                aria-label="Forsikringsstatus"
                value={insuranceVal ?? ""}
                onChange={(e) => setValue("insuranceStatus", e.target.value)}
              >
                {insuranceOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
        </div>

        <DialogFooter className="-mx-6 -mb-6 mt-2 gap-3 border-t border-rn-border-strong/60 bg-muted/40 px-6 py-4 sm:-mx-6 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="cta"
            className="border-2 border-rn-border-strong"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Avbryt
          </Button>
          <Button
            type="submit"
            variant="success"
            size="cta"
            disabled={isSubmitting}
            className="disabled:opacity-60"
          >
            {isSubmitting
              ? "Lagrer …"
              : isEdit
                ? "Lagre"
                : "Opprett inventarpost"}
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
    "all" | AssetStatusBucket
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
      if (statusFilter !== "all" && assetStatusBucket(a.condition) !== statusFilter) {
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
    let uninsuredValue = 0;
    const counts = { operational: 0, maintenance: 0, replace: 0 };
    for (const a of assets) {
      const v = Number(a.value);
      const q = Number(a.quantity);
      totalValue += v;
      totalUnits += q;
      counts[assetStatusBucket(a.condition)] += 1;
      if (assetRowInsuranceIsCovered(a.insurance_status)) {
        insuredValue += v;
      } else {
        uninsuredValue += v;
      }
    }
    return {
      totalValue,
      totalUnits,
      counts,
      insuredValue,
      uninsuredValue,
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
    toast.success("Inventarpost slettet");
    router.refresh();
  }

  return (
    <div className="assets-page-workspace mx-auto flex w-full flex-col gap-8 pb-24 md:pb-8">
      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div
          className={cn(
            "assets-page-header border-b-2 border-rn-border-strong bg-card/80",
            "px-[length:var(--app-card-padding)] sm:px-[length:calc(var(--app-card-padding)+0.25rem)] md:px-[length:calc(var(--app-card-padding)+0.5rem)] lg:px-[length:calc(var(--app-card-padding)+0.75rem)]",
            "py-6 md:py-7",
          )}
        >
          <AppPageHeader
            className="mb-0 gap-3 md:gap-4"
            surface="default"
            title="Inventar"
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
                className={cn(buttonVariants({ variant: "success", size: "cta" }))}
              >
                <Plus className="size-5" aria-hidden />
                Ny inventarpost
              </Button>
            }
          />
        </div>

        {loadError ? (
          <div
            className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 lg:px-6"
            role="alert"
          >
            <div className="assets-load-error rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
              Kunne ikke laste data: {loadError}
            </div>
          </div>
        ) : null}

        {!loadError && properties.length === 0 ? (
          <div
            className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 lg:px-6"
            role="status"
          >
            <div className="assets-setup-hint rounded-md border-2 border-amber-500/35 bg-amber-500/10 px-4 py-3 text-amber-950 dark:text-amber-50">
              Det finnes ingen lokaler ennå. Inventar må knyttes til et lokale — legg inn
              eiendommer i databasen (eller kontakt administrator) før du registrerer
              inventar.
            </div>
          </div>
        ) : null}

        {!loadError && properties.length > 0 && assets.length > 0 ? (
          <section
            className="assets-kpi-summary border-t border-rn-border-strong/50 px-4 py-6 sm:px-5 sm:py-7 md:px-6 md:py-8 lg:px-8"
            aria-label="Sammendrag inventar"
          >
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12 xl:gap-16">
              <div className="min-w-0 shrink-0 lg:max-w-md">
                <p className="assets-kpi-label">Total verdi</p>
                <p className="assets-kpi-value mt-2 font-heading text-success">
                  {formatNok(stats.totalValue)}
                </p>
                <p className="assets-kpi-caption mt-3 text-muted-foreground">
                  {stats.rowCount}{" "}
                  {stats.rowCount === 1 ? "registrering" : "registreringer"} ·{" "}
                  {stats.totalUnits}{" "}
                  {stats.totalUnits === 1 ? "enhet" : "enheter"}
                </p>
              </div>
              <dl className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-5 lg:gap-4 xl:gap-5">
                <div className={assetsKpiStatTileClass}>
                  <dt className="assets-stat-label">I drift</dt>
                  <dd className="assets-stat-value font-heading text-foreground">
                    {stats.counts.operational}
                  </dd>
                </div>
                <div className={assetsKpiStatTileClass}>
                  <dt className="assets-stat-label">Vedlikehold</dt>
                  <dd className="assets-stat-value font-heading text-foreground">
                    {stats.counts.maintenance}
                  </dd>
                </div>
                <div className={assetsKpiStatTileClass}>
                  <dt className="assets-stat-label">Bytte</dt>
                  <dd className="assets-stat-value font-heading text-foreground">
                    {stats.counts.replace}
                  </dd>
                </div>
                <div className={assetsKpiStatTileClass}>
                  <dt className="assets-stat-label">Forsikret verdi</dt>
                  <dd className="assets-stat-value font-heading text-foreground">
                    {formatNok(stats.insuredValue)}
                  </dd>
                </div>
                <div className={assetsKpiStatTileClass}>
                  <dt className="assets-stat-label">Uforsikret verdi</dt>
                  <dd className="assets-stat-value font-heading text-foreground">
                    {formatNok(stats.uninsuredValue)}
                  </dd>
                </div>
              </dl>
            </div>
            {hasActiveFilters ? (
              <p className="assets-filter-hint mt-8 border-t border-rn-border-strong/60 pt-6 text-muted-foreground">
                <span className="font-medium text-foreground">Filtrert:</span>{" "}
                {formatNok(filteredStats.totalValue)} · {filteredStats.totalUnits}{" "}
                enheter ({filtered.length}{" "}
                {filtered.length === 1 ? "linje" : "linjer"})
              </p>
            ) : null}
          </section>
        ) : null}

        <div className="min-w-0">
          <div className="border-t-2 border-b-2 border-rn-border-strong/50 bg-card px-4 py-3 sm:px-6 md:px-8 md:py-4">
          <div className="flex min-h-11 flex-nowrap items-center gap-2 overflow-x-auto sm:min-h-12 sm:gap-3 md:gap-4">
            <div className="flex shrink-0 items-center gap-2 pr-1">
              <h2 className="assets-inventory-title font-heading font-bold tracking-tight text-rn-text-heading whitespace-nowrap">
                Inventar
              </h2>
              {assets.length === 0 ? (
                <span className="assets-toolbar-meta text-muted-foreground whitespace-nowrap">
                  Ingen data
                </span>
              ) : hasActiveFilters ? (
                <span
                  className="assets-toolbar-meta tabular-nums text-muted-foreground whitespace-nowrap"
                  title="Synlige av totalt antall linjer"
                >
                  {filtered.length}/{assets.length}
                </span>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="assets-toolbar-btn h-11 shrink-0 gap-2 rounded-md border-2 border-rn-border-strong px-3 font-semibold sm:h-12 sm:px-4"
                disabled={filtered.length === 0}
                onClick={() => downloadAssetsCsv(filtered)}
                aria-label="Last ned synlige rader som CSV"
                title="Last ned synlige rader som CSV"
              >
                <Download className="size-4 shrink-0 sm:size-5" aria-hidden />
                CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                className="assets-toolbar-btn h-11 shrink-0 rounded-md border-2 border-rn-border-strong px-4 font-semibold sm:h-12"
                disabled={!hasActiveFilters}
                title={
                  hasActiveFilters
                    ? "Fjern søk, lokalefilter og tilstandsfilter"
                    : "Ingen aktive filtre"
                }
                onClick={resetFilters}
              >
                Nullstill
              </Button>
            </div>

            <div className="relative min-w-[min(100%,12rem)] flex-1 basis-48">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground sm:left-4"
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
                className="assets-search-input h-11 w-full min-w-[10rem] rounded-md border-2 border-rn-border-strong bg-background pl-11 sm:h-12 sm:pl-12 focus-visible:border-success focus-visible:ring-success/25"
                aria-label="Søk i inventar"
              />
            </div>

            <div className="relative w-40 shrink-0 sm:w-48">
              <Building2
                className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-5 -translate-y-1/2 text-muted-foreground sm:left-4"
                aria-hidden
              />
              <NativeSelect
                value={propertyId}
                onChange={(e) => {
                  setPropertyId(e.target.value);
                  setPage(1);
                }}
                aria-label="Filtrer etter lokale"
                className="rounded-md py-0 pl-11 sm:pl-12"
              >
                <option value="">Alle lokaler</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="relative w-36 shrink-0 sm:w-44">
              <Wrench
                className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-5 -translate-y-1/2 text-muted-foreground sm:left-4"
                aria-hidden
              />
              <NativeSelect
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as "all" | AssetStatusBucket);
                  setPage(1);
                }}
                aria-label="Filtrer etter tilstand"
                className="rounded-md py-0 pl-11 sm:pl-12"
              >
                {STATUS_QUICK_FILTERS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center md:gap-5 md:px-8 md:py-20">
            <div
              className="flex size-16 items-center justify-center rounded-md border-2 border-rn-border-strong bg-muted/40 md:size-18"
              aria-hidden
            >
              <Package className="size-8 text-muted-foreground md:size-9" />
            </div>
            <p className="assets-empty-hint max-w-sm text-muted-foreground">
              {assets.length === 0 ? (
                <>
                  Ingen inventar i registeret ennå.
                  {canEdit && properties.length > 0 ? (
                    <>
                      {" "}
                      Bruk <span className="font-medium text-foreground">Ny inventarpost</span>{" "}
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
                  className={cn(
                    "min-w-[5.5rem] px-3 py-4 text-right sm:min-w-28 md:px-8 md:py-5",
                    assetsTableHeadClass,
                  )}
                >
                  <span className="sr-only">Rediger eller slett</span>
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
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-success/20 bg-rn-surface-gradient-from text-success md:size-12">
                          <Icon className="size-5 md:size-6" aria-hidden />
                        </div>
                        <span className="assets-row-name text-success">
                          {a.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        assetsTableCellClass,
                        "assets-row-meta text-muted-foreground",
                      )}
                    >
                      {a.propertyName ?? "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        assetsTableCellClass,
                        "assets-row-qty text-center",
                      )}
                    >
                      {a.quantity}
                    </TableCell>
                    <TableCell
                      className={cn(
                        assetsTableCellClass,
                        "assets-row-value text-success",
                      )}
                    >
                      {formatNok(Number(a.value))}
                    </TableCell>
                    <TableCell className={assetsTableCellClass}>
                      <span
                        className={cn(
                          "assets-condition-pill inline-flex rounded-full px-3 py-1 font-bold",
                          conditionPillClass(a.condition),
                        )}
                      >
                        {a.condition?.trim() || "Ikke satt"}
                      </span>
                    </TableCell>
                    <TableCell className={assetsTableCellClass}>
                      <span
                        className={cn(
                          "assets-insurance-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold",
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
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={!canEdit}
                          className="size-10 shrink-0 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-40"
                          aria-label={`Rediger ${a.name}`}
                          onClick={() => setDialog({ open: true, row: a })}
                        >
                          <Pencil className="size-5" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={!canEdit}
                          className="size-10 shrink-0 rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-40"
                          aria-label={`Slett ${a.name}`}
                          onClick={() => void deleteAsset(a.id, a.name)}
                        >
                          <Trash2 className="size-5" aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {filtered.length > 0 ? (
          <div className="assets-page-footer flex flex-col gap-3 border-t-2 border-rn-border-strong bg-rn-surface-footer px-6 py-5 text-rn-footer-text sm:flex-row sm:items-center sm:justify-between md:px-8 md:py-6">
            <span>
              Viser {pageRows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} av{" "}
              {filtered.length}
              {statusFilter !== "all"
                ? ` · ${
                    STATUS_QUICK_FILTERS.find((o) => o.id === statusFilter)
                      ?.label ?? statusFilter
                  }`
                : null}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="assets-toolbar-btn h-11 gap-1 rounded-md border-2 border-rn-border-strong px-4 font-semibold"
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
                className="assets-toolbar-btn h-11 gap-1 rounded-md border-2 border-rn-border-strong px-4 font-semibold"
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
      </div>

      <Dialog
        open={dialog.open}
        onOpenChange={(open) => {
          if (!open) setDialog({ open: false, row: null });
          else setDialog((s) => ({ ...s, open: true }));
        }}
      >
        <DialogContent
          className="max-h-[90vh] max-w-lg gap-0 overflow-y-auto rounded-md border-2 border-rn-border-strong/60 bg-card p-6 text-base shadow-xl sm:max-w-xl md:max-w-2xl md:p-8"
          showCloseButton
        >
          {dialog.open ? (
            properties.length > 0 ? (
              <AssetFormFields
                key={dialog.row?.id ?? "new"}
                properties={properties}
                row={dialog.row}
                suggestedPropertyId={
                  dialog.row ? undefined : propertyId || undefined
                }
                onClose={() => setDialog({ open: false, row: null })}
              />
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="font-heading text-xl font-bold text-rn-text-heading md:text-2xl">
                    Kan ikke legge til inventarpost
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
                    className="h-12 rounded-md border-2 border-rn-border-strong px-6 text-base font-semibold"
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
