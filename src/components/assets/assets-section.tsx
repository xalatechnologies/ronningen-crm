"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { APP_DATA_BODY, APP_DATA_PRIMARY } from "@/lib/table-typography";
import {
  type AssetStatusBucket,
  assetInsuranceBucket,
  assetRowInsuranceIsCovered,
  assetStatusBucket,
} from "@/lib/asset-status-bucket";
import { assetFormSchema, type AssetFormInput, ASSET_CONDITION_PRESET_VALUES, ASSET_INSURANCE_PRESET_VALUES } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
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
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useTranslation } from "@/i18n/client";
import type { Translator } from "@/i18n/types";
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
const assetsKpiCompactStatClass =
  "flex min-w-0 flex-col gap-1.5 rounded-md border border-rn-border-strong/55 bg-background px-4 py-3 sm:gap-2 sm:px-4 sm:py-3.5";

export type AssetsSectionProps = {
  assets: AssetListItem[];
  properties: { id: string; name: string }[];
  loadError: string | null;
  /** Owner/admin from server — avoids client role flash */
  canManageAssets: boolean;
};

const PAGE_SIZE = 20;

const STATUS_FILTER_IDS = ["all", "operational", "maintenance", "replace"] as const;

const CONDITION_PRESET_VALUES = ASSET_CONDITION_PRESET_VALUES;

const INSURANCE_PRESET_VALUES = ASSET_INSURANCE_PRESET_VALUES;

function statusFilterLabel(
  id: (typeof STATUS_FILTER_IDS)[number],
  t: Translator,
): string {
  return t(`assets.status.${id}`);
}

function conditionPresetOptions(t: Translator) {
  return (
    Object.entries(CONDITION_PRESET_VALUES) as Array<
      [keyof typeof CONDITION_PRESET_VALUES, string]
    >
  ).map(([key, value]) => ({
    value,
    label: t(`assets.conditions.${key}`),
  }));
}

function insurancePresetOptions(t: Translator) {
  return (
    Object.entries(INSURANCE_PRESET_VALUES) as Array<
      [keyof typeof INSURANCE_PRESET_VALUES, string]
    >
  ).map(([key, value]) => ({
    value,
    label: t(`assets.insurance.${key}`),
  }));
}

const ICONS = [Package, Armchair, Wind, Coffee, Snowflake, Box] as const;

type AssetsInventoryStats = {
  totalValue: number;
  totalUnits: number;
  rowCount: number;
  counts: { operational: number; maintenance: number; replace: number };
  insuredValue: number;
  uninsuredValue: number;
};

function AssetsKpiSummary({
  stats,
  filteredStats,
  filteredCount,
  hasActiveFilters,
  formatCurrency,
  t,
}: {
  stats: AssetsInventoryStats;
  filteredStats: { totalValue: number; totalUnits: number };
  filteredCount: number;
  hasActiveFilters: boolean;
  formatCurrency: (value: number) => string;
  t: Translator;
}) {
  const entriesLabel =
    stats.rowCount === 1
      ? t("assets.registrationWord")
      : t("assets.registrationsWord");
  const unitsLabel =
    stats.totalUnits === 1 ? t("assets.unitWord") : t("assets.unitsWord");

  const statTiles = [
    { label: t("assets.statusOperational"), value: stats.counts.operational },
    { label: t("assets.statusMaintenance"), value: stats.counts.maintenance },
    { label: t("assets.statusReplace"), value: stats.counts.replace },
    { label: t("assets.insuredValue"), value: formatCurrency(stats.insuredValue) },
    {
      label: t("assets.uninsuredValue"),
      value: formatCurrency(stats.uninsuredValue),
      highlight: stats.uninsuredValue > 0,
    },
  ] as const;

  return (
    <section
      className="assets-kpi-summary border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 md:py-7 lg:px-8"
      aria-label={t("assets.kpiAria")}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10 xl:gap-12">
        <div className="min-w-0 shrink-0 lg:max-w-sm">
          <p className="dashboard-kpi-label">{t("assets.kpiTotal")}</p>
          <p className="dashboard-kpi-value mt-2 text-success">
            {formatCurrency(stats.totalValue)}
          </p>
          <p className="dashboard-kpi-caption mt-2 text-muted-foreground">
            {stats.rowCount} {entriesLabel} · {stats.totalUnits} {unitsLabel}
          </p>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3 xl:gap-4">
          {statTiles.map((tile) => (
            <div key={tile.label} className={assetsKpiCompactStatClass}>
              <p className="text-app-xs font-medium leading-snug text-muted-foreground sm:text-app-sm">
                {tile.label}
              </p>
              <p
                className={cn(
                  "font-heading text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl",
                  "highlight" in tile && tile.highlight
                    ? "text-amber-900 dark:text-amber-200"
                    : undefined,
                )}
              >
                {tile.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {hasActiveFilters ? (
        <p className="assets-filter-hint mt-5 border-t border-rn-border-strong/50 pt-5 text-muted-foreground lg:mt-6">
          <span className="font-semibold text-foreground">{t("assets.filteredLabel")}</span>{" "}
          {formatCurrency(filteredStats.totalValue)} · {filteredStats.totalUnits}{" "}
          {t("assets.unitsWord")} ({filteredCount}{" "}
          {filteredCount === 1 ? t("assets.lineWord") : t("assets.linesWord")})
        </p>
      ) : null}
    </section>
  );
}

function assetIconForName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return ICONS[h % ICONS.length]!;
}

function insurancePresentation(
  status: string | null,
  t: Translator,
): {
  safeLabel: string;
  tone: "ok" | "warn" | "bad";
} {
  const bucket = assetInsuranceBucket(status);
  if (bucket === "covered") {
    return { safeLabel: t("assets.insurance.covered"), tone: "ok" };
  }
  if (bucket === "excluded") {
    return { safeLabel: t("assets.insurance.excluded"), tone: "bad" };
  }
  if (bucket === "unknown") {
    return { safeLabel: t("assets.insurance.unknown"), tone: "warn" };
  }
  const raw = (status ?? "").replaceAll("\u00a0", " ").trim();
  return { safeLabel: raw || t("assets.insurance.unknown"), tone: "warn" };
}

function downloadAssetsCsv(rows: AssetListItem[], t: Translator) {
  const headers = [
    t("assets.csv.name"),
    t("assets.csv.venue"),
    t("assets.csv.quantity"),
    t("assets.csv.value"),
    t("assets.csv.condition"),
    t("assets.csv.insurance"),
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
  el.download = t("assets.csv.filename", {
    date: new Date().toISOString().slice(0, 10),
  });
  el.click();
  URL.revokeObjectURL(url);
}

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function conditionPillClass(condition: string | null) {
  const b = assetStatusBucket(condition);
  if (b === "operational")
    return "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
  if (b === "maintenance")
    return "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200";
  return "bg-destructive/15 text-destructive";
}

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
  const { t } = useTranslation();
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const { invalidateAssets } = useTenantDataInvalidation();
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
      condition: row?.condition ?? CONDITION_PRESET_VALUES.good,
      insuranceStatus: row?.insurance_status ?? INSURANCE_PRESET_VALUES.unknown,
    },
  });

  const idProperty = useId();
  const idName = useId();
  const idQty = useId();
  const idValue = useId();
  const idCondition = useId();
  const idInsurance = useId();

  const conditionOptions = useMemo(() => {
    const presets = conditionPresetOptions(t);
    const c = row?.condition?.trim();
    if (c && !presets.some((p) => p.value === c)) {
      return [
        { value: c, label: `${c} ${t("assets.savedSuffix")}` },
        ...presets,
      ];
    }
    return presets;
  }, [row?.condition, t]);

  const insuranceOptions = useMemo(() => {
    const presets = insurancePresetOptions(t);
    const c = row?.insurance_status?.trim();
    if (c && !presets.some((p) => p.value === c)) {
      return [
        { value: c, label: `${c} ${t("assets.savedSuffix")}` },
        ...presets,
      ];
    }
    return presets;
  }, [row?.insurance_status, t]);

  const { register, control, handleSubmit, formState, setValue, watch } = form;
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
        toast.error(t("assets.toasts.updateFailed"), {
          description: error.message,
        });
        return;
      }
      toast.success(t("assets.toasts.updated"));
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

      const { error } = await supabase.from("assets").insert({
        ...payload,
        organization_id: orgId,
      });
      if (error) {
        toast.error(t("assets.toasts.createFailed"), {
          description: error.message,
        });
        return;
      }
      toast.success(t("assets.toasts.created"));
    }
    onClose();
    invalidateAssets();
  }

  const title = isEdit ? t("assets.editTitle") : t("assets.newTitle");

  return (
    <>
      <DialogHeader className="space-y-0 border-b border-rn-border-strong/60 pb-5 pr-10 text-left sm:pr-12">
        <DialogTitle className="font-heading text-xl font-bold text-rn-text-heading sm:text-2xl">
          {title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isEdit ? t("assets.editFormAria") : t("assets.newFormAria")}
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
              {t("finance.filterVenue")}
            </Label>
            <PropertySelectField
              name="propertyId"
              control={control}
              id={idProperty}
              properties={properties}
            />
            {formState.errors.propertyId ? (
              <p className="text-sm text-destructive" role="alert">
                {formState.errors.propertyId.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={idName} className="text-sm font-semibold text-foreground">
              {t("common.fields.name")}
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
                {t("assets.tableQuantity")}
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
                {t("assets.tableValue")}{" "}
                <span className="font-normal text-muted-foreground">(NOK)</span>
              </Label>
              <PriceInput
                id={idValue}
                aria-invalid={!!formState.errors.value}
                className="h-12 rounded-md border-2 border-rn-border-strong text-base focus-visible:border-success focus-visible:ring-success/25"
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
                {t("assets.tableCondition")}
              </Label>
              <FormSelect
                id={idCondition}
                aria-label={t("assets.conditionAria")}
                value={conditionVal ?? ""}
                onValueChange={(v) => setValue("condition", v)}
                options={conditionOptions}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor={idInsurance}
                className="text-sm font-semibold text-foreground"
              >
                {t("assets.tableInsurance")}
              </Label>
              <FormSelect
                id={idInsurance}
                aria-label={t("assets.insuranceAria")}
                value={insuranceVal ?? ""}
                onValueChange={(v) => setValue("insuranceStatus", v)}
                options={insuranceOptions}
              />
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
            {t("common.actions.cancel")}
          </Button>
          <Button
            type="submit"
            variant="success"
            size="cta"
            disabled={isSubmitting}
            className="disabled:opacity-60"
          >
            {isSubmitting
              ? t("common.saving")
              : isEdit
                ? t("common.actions.save")
                : t("assets.createItem")}
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
  const { t, formatCurrency } = useTranslation();
  const supabase = useSupabase();
  const { invalidateAssets } = useTenantDataInvalidation();

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
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

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

  async function confirmDeleteAsset() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const { error } = await supabase
        .from("assets")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) {
        toast.error(t("assets.toasts.deleteFailed"), { description: error.message });
        return;
      }
      toast.success(t("assets.toasts.deleted"));
      setDeleteTarget(null);
      invalidateAssets();
    } finally {
      setDeleteBusy(false);
    }
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
            title={t("assets.title")}
            actions={
              <Button
                type="button"
                onClick={() => setDialog({ open: true, row: null })}
                disabled={!canEdit || properties.length === 0}
                title={
                  !canEdit
                    ? t("assets.requiresAccess")
                    : properties.length === 0
                      ? t("assets.addVenuesFirst")
                      : undefined
                }
                className={cn(buttonVariants({ variant: "success", size: "cta" }))}
              >
                <Plus className="size-5" aria-hidden />
                {t("assets.newItem")}
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
              {t("assets.loadError", { error: loadError })}
            </div>
          </div>
        ) : null}

        {!loadError && properties.length === 0 ? (
          <div
            className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 lg:px-6"
            role="status"
          >
            <div className="assets-setup-hint rounded-md border-2 border-amber-500/35 bg-amber-500/10 px-4 py-3 text-amber-950 dark:text-amber-50">
              {t("assets.noVenuesHint")}{" "}
              <Link
                href="/app/settings/lokaler"
                className="font-semibold text-amber-950 underline underline-offset-2 dark:text-amber-50"
              >
                {t("assets.registerVenuesLink")}
              </Link>{" "}
              {t("assets.beforeAddingAssets")}
            </div>
          </div>
        ) : null}

        {!loadError && properties.length > 0 && assets.length > 0 ? (
          <AssetsKpiSummary
            stats={stats}
            filteredStats={filteredStats}
            filteredCount={filtered.length}
            hasActiveFilters={hasActiveFilters}
            formatCurrency={formatCurrency}
            t={t}
          />
        ) : null}

        <div className="min-w-0">
          <div className="border-t-2 border-b-2 border-rn-border-strong/50 bg-card px-4 py-3 sm:px-6 md:px-8 md:py-4">
          <div className="flex min-h-12 flex-nowrap items-center gap-2 overflow-x-auto sm:gap-3 md:min-h-14 md:gap-4">
            {assets.length === 0 || hasActiveFilters ? (
              <div className="flex shrink-0 items-center pr-1">
                {assets.length === 0 ? (
                  <span className="assets-toolbar-meta text-muted-foreground whitespace-nowrap">
                    {t("assets.noData")}
                  </span>
                ) : (
                  <span
                    className="assets-toolbar-meta tabular-nums text-muted-foreground whitespace-nowrap"
                    title={t("assets.visibleOfTotal")}
                  >
                    {filtered.length}/{assets.length}
                  </span>
                )}
              </div>
            ) : null}

            <div className="relative min-w-[10rem] flex-1 basis-48">
              <Search
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground md:left-5"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={t("assets.searchPlaceholder")}
                title={t("assets.searchTitle")}
                className="assets-search-input h-12 min-h-12 w-full min-w-[10rem] rounded-md border-2 border-rn-border-strong bg-background pl-12 focus-visible:border-success focus-visible:ring-success/25 md:h-14 md:min-h-14 md:pl-14"
                aria-label={t("assets.searchAria")}
              />
            </div>

            <div className="relative w-48 shrink-0 sm:w-56 md:w-60">
              <Building2
                className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-muted-foreground md:left-5"
                aria-hidden
              />
              <FormSelect
                value={propertyId}
                onValueChange={(v) => {
                  setPropertyId(v);
                  setPage(1);
                }}
                aria-label={t("assets.filterVenueAria")}
                className="assets-filter-select h-12 min-h-12 rounded-md py-0 pl-12 md:h-14 md:min-h-14 md:pl-14"
                placeholder={t("assets.allVenues")}
                options={toIdNameOptions(properties)}
              />
            </div>

            <div className="relative w-36 shrink-0 sm:w-44">
              <Wrench
                className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-muted-foreground md:left-5"
                aria-hidden
              />
              <FormSelect
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v as "all" | AssetStatusBucket);
                  setPage(1);
                }}
                aria-label={t("assets.filterConditionAria")}
                className="assets-filter-select h-12 min-h-12 rounded-md py-0 pl-12 md:h-14 md:min-h-14 md:pl-14"
                options={STATUS_FILTER_IDS.map((id) => ({
                  value: id,
                  label: statusFilterLabel(id, t),
                }))}
              />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="assets-toolbar-btn h-12 min-h-12 shrink-0 gap-2 rounded-md border-2 border-rn-border-strong px-3 font-semibold sm:px-4 md:h-14 md:min-h-14 md:px-5"
                disabled={filtered.length === 0}
                onClick={() => downloadAssetsCsv(filtered, t)}
                aria-label={t("assets.downloadCsvAria")}
                title={t("assets.downloadCsvTitle")}
              >
                <Download className="size-4 shrink-0 sm:size-5" aria-hidden />
                CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                className="assets-toolbar-btn h-12 min-h-12 shrink-0 rounded-md border-2 border-rn-border-strong px-4 font-semibold md:h-14 md:min-h-14 md:px-5"
                disabled={!hasActiveFilters}
                title={
                  hasActiveFilters
                    ? t("assets.clearFilters")
                    : t("assets.noActiveFilters")
                }
                onClick={resetFilters}
              >
                {t("assets.reset")}
              </Button>
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
                  {t("assets.emptyNoAssets")}
                  {canEdit && properties.length > 0 ? (
                    <>
                      {" "}
                      {t("assets.emptyUseNewItem")}{" "}
                      <span className="font-medium text-foreground">
                        {t("assets.newItem")}
                      </span>{" "}
                      {t("assets.emptyUseNewItemSuffix")}
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  {t("assets.emptyNoMatch")}{" "}
                  <button
                    type="button"
                    className="font-semibold text-success underline underline-offset-2"
                    onClick={resetFilters}
                  >
                    {t("assets.resetFilters")}
                  </button>
                </>
              )}
            </p>
          </div>
        ) : (
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow className="border-rn-border-strong/50 bg-rn-surface-table-head hover:bg-rn-surface-table-head">
                <TableHead className={assetsTableHeadClass}>{t("common.fields.name")}</TableHead>
                <TableHead className={assetsTableHeadClass}>{t("finance.filterVenue")}</TableHead>
                <TableHead
                  className={cn(assetsTableHeadClass, "text-center")}
                >
                  {t("assets.tableQuantity")}
                </TableHead>
                <TableHead className={assetsTableHeadClass}>{t("assets.tableValue")}</TableHead>
                <TableHead className={assetsTableHeadClass}>{t("assets.tableCondition")}</TableHead>
                <TableHead className={assetsTableHeadClass}>
                  {t("assets.tableInsurance")}
                </TableHead>
                <TableHead
                  className={cn(
                    "min-w-[5.5rem] px-3 py-4 text-right sm:min-w-28 md:px-8 md:py-5",
                    assetsTableHeadClass,
                  )}
                >
                  <span className="sr-only">{t("assets.editOrDelete")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((a) => {
                const Icon = assetIconForName(a.name);
                const ins = insurancePresentation(a.insurance_status, t);
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
                        <span className={cn("assets-row-name", APP_DATA_PRIMARY, "text-success")}>
                          {a.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        assetsTableCellClass,
                        APP_DATA_BODY,
                        "assets-row-meta",
                      )}
                    >
                      {a.propertyName ?? "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        assetsTableCellClass,
                        APP_DATA_BODY,
                        "assets-row-qty text-center tabular-nums",
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
                      {formatCurrency(Number(a.value))}
                    </TableCell>
                    <TableCell className={assetsTableCellClass}>
                      <span
                        className={cn(
                          "assets-condition-pill inline-flex rounded-full px-3 py-1 font-bold",
                          conditionPillClass(a.condition),
                        )}
                      >
                        {a.condition?.trim() || t("assets.conditionNotSet")}
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
                          aria-label={t("assets.editAria", { name: a.name })}
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
                          aria-label={t("assets.deleteAria", { name: a.name })}
                          onClick={() =>
                            setDeleteTarget({ id: a.id, name: a.name })
                          }
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
              {t("assets.footerShowing", {
                from: pageRows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0,
                to: Math.min(currentPage * PAGE_SIZE, filtered.length),
                total: filtered.length,
              })}
              {statusFilter !== "all"
                ? ` · ${statusFilterLabel(statusFilter, t)}`
                : null}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="assets-toolbar-btn h-12 min-h-12 gap-1 rounded-md border-2 border-rn-border-strong px-4 font-semibold md:h-14 md:min-h-14 md:px-5"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-5" aria-hidden />
                {t("assets.footerPrev")}
              </Button>
              <span className="flex items-center px-2 tabular-nums">
                {t("assets.footerPageOf", {
                  current: currentPage,
                  total: totalPages,
                })}
              </span>
              <Button
                type="button"
                variant="outline"
                className="assets-toolbar-btn h-12 min-h-12 gap-1 rounded-md border-2 border-rn-border-strong px-4 font-semibold md:h-14 md:min-h-14 md:px-5"
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
                    {t("assets.cannotAddTitle")}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground md:text-base">
                  {t("assets.cannotAddDescription")}
                </p>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-md border-2 border-rn-border-strong px-6 text-base font-semibold"
                    onClick={() => setDialog({ open: false, row: null })}
                  >
                    {t("common.actions.close")}
                  </Button>
                </DialogFooter>
              </>
            )
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("assets.delete.title")}
        description={
          deleteTarget
            ? t("assets.delete.description", { name: deleteTarget.name })
            : null
        }
        confirmLabel={t("assets.delete.confirm")}
        busy={deleteBusy}
        onConfirm={confirmDeleteAsset}
      />
    </div>
  );
}
