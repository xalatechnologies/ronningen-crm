"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  getPackageContractTemplate,
  listTemplates,
  setPackageContractTemplate,
} from "@/lib/contracts/templates";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { APP_DATA_AMOUNT, APP_DATA_PRIMARY, APP_TABLE_HEAD_CELL } from "@/lib/table-typography";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useOrganizationPermissions } from "@/hooks/use-organization-permissions";
import {
  pricingPackageFormSchema,
  type PricingPackageFormInput,
} from "@/lib/validations";
import { cn } from "@/lib/utils";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import type { Database } from "@/types/database.types";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Camera,
  CheckCircle2,
  Music,
  Pencil,
  Plus,
  Puzzle,
  Sparkles,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useTranslation } from "@/i18n/client";
import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { parsePackageDescription } from "@/lib/pricing/parse-package-description";
import { statusLabel } from "@/lib/navigation/nav-labels";

type PackageRow = Database["public"]["Tables"]["packages"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

export type PricingSectionProps = {
  packages: PackageRow[];
  services: ServiceRow[];
  loadError: string | null;
};

const pricingTableHeadClass = cn("pricing-table-head", APP_TABLE_HEAD_CELL);
const pricingTableCellClass = "px-6 py-5 md:px-8 md:py-6";

/** Liste-tegn brukere skriver foran punkter (-, –, —, •, *). */
const PACKAGE_TIER_ORDER = [
  "basis",
  "plus",
  "premium",
  "luksus",
  "luxury",
] as const;

function packageTierSortKey(name: string): number {
  const n = name.toLowerCase();
  for (let i = 0; i < PACKAGE_TIER_ORDER.length; i++) {
    if (n.includes(PACKAGE_TIER_ORDER[i])) return i;
  }
  return 100;
}

function serviceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("catering") || n.includes("mat"))
    return UtensilsCrossed;
  if (n.includes("foto") || n.includes("photo"))
    return Camera;
  if (n.includes("musikk") || n.includes("dj") || n.includes("music"))
    return Music;
  if (n.includes("dekor")) return Sparkles;
  return Puzzle;
}

type CatalogKind = "packages" | "services";

function PricingCatalogFields({
  kind,
  row,
  onClose,
}: {
  kind: CatalogKind;
  row: PackageRow | ServiceRow | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const { invalidatePricing } = useTenantDataInvalidation();
  const isEdit = row != null;

  const form = useForm<PricingPackageFormInput>({
    resolver: zodResolver(
      pricingPackageFormSchema,
    ) as Resolver<PricingPackageFormInput>,
    defaultValues: {
      name: row?.name ?? "",
      description: row?.description ?? "",
      price: row?.price ?? 0,
      active: row?.active ?? true,
    },
  });

  const { register, handleSubmit, formState } = form;

  const [templates, setTemplates] = useState<{ id: string; name: string; isDefault: boolean }[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [initialTemplateId, setInitialTemplateId] = useState("");
  useEffect(() => {
    if (kind !== "packages" || !row || !currentOrganizationId) return;
    let cancelled = false;
    void (async () => {
      const [listed, current] = await Promise.all([
        listTemplates(currentOrganizationId),
        getPackageContractTemplate(currentOrganizationId, row.id),
      ]);
      if (cancelled || !listed.ok || !current.ok) return;
      setTemplates(listed.templates);
      setTemplateId(current.templateId ?? "");
      setInitialTemplateId(current.templateId ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, row, currentOrganizationId]);

  async function onSubmit(data: PricingPackageFormInput) {
    const payload = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      price: data.price,
      active: data.active,
    };

    if (isEdit && row) {
      const { error } = await supabase
        .from(kind)
        .update(payload)
        .eq("id", row.id);
      if (error) {
        toast.error(t("pricing.updateFailed"), { description: error.message });
        return;
      }
      if (kind === "packages" && currentOrganizationId && templateId !== initialTemplateId) {
        const linked = await setPackageContractTemplate({
          organizationId: currentOrganizationId,
          packageId: row.id,
          templateId: templateId || null,
        });
        if (!linked.ok) {
          toast.error(t("pricing.updateFailed"), { description: linked.error });
          return;
        }
      }
      toast.success(
        kind === "packages" ? t("pricing.packageUpdated") : t("pricing.serviceUpdated"),
      );
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

      const { error } = await supabase.from(kind).insert({
        ...payload,
        organization_id: orgId,
      });
      if (error) {
        toast.error(t("pricing.createFailed"), { description: error.message });
        return;
      }
      toast.success(
        kind === "packages" ? t("pricing.packageCreated") : t("pricing.serviceCreated"),
      );
    }

    onClose();
    invalidatePricing();
  }

  const title =
    kind === "packages"
      ? isEdit
        ? t("pricing.editPackage")
        : t("pricing.newPackage")
      : isEdit
        ? t("pricing.editService")
        : t("pricing.newService");

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-heading text-xl font-bold text-rn-text-heading md:text-2xl">
          {title}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>{t("common.fields.name")}</Label>
          <Input
            className="h-12 rounded-xl border border-foreground/25 bg-background px-4 text-base shadow-none hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20"
            {...register("name")}
          />
          {formState.errors.name ? (
            <p className="text-xs text-destructive">
              {formState.errors.name.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>
            {kind === "packages"
              ? t("pricing.descriptionPackages")
              : t("pricing.descriptionServices")}
          </Label>
          <Textarea
            className={cn(
              "rounded-xl border border-foreground/25 bg-background p-4 text-base shadow-none hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20",
              kind === "packages" ? "min-h-36" : "min-h-28",
            )}
            placeholder={
              kind === "packages"
                ? t("pricing.descriptionPackagesPlaceholder")
                : t("pricing.descriptionServicesPlaceholder")
            }
            {...register("description")}
          />
          {kind === "packages" ? (
            <p className="text-xs leading-relaxed text-muted-foreground md:text-sm">
              {t("pricing.packagesHint")}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>{t("pricing.priceNok")}</Label>
          <PriceInput
            className="h-12 rounded-xl border border-foreground/25 bg-background px-4 text-base shadow-none hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20"
            {...register("price")}
          />
          {formState.errors.price ? (
            <p className="text-xs text-destructive">
              {formState.errors.price.message}
            </p>
          ) : null}
        </div>
        {kind === "packages" && isEdit && templates.length > 1 ? (
          <div className="space-y-2">
            <Label>{t("contracts.template.forPackage")}</Label>
            <select
              className="h-12 w-full rounded-xl border border-foreground/25 bg-background px-4 text-base shadow-none hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">{t("contracts.template.forPackageDefault")}</option>
              {templates
                .filter((template) => !template.isDefault)
                .map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
            </select>
          </div>
        ) : null}
        <label className="flex cursor-pointer items-center gap-2 text-base text-foreground">
          <input
            type="checkbox"
            className="size-4 rounded accent-success md:size-[1.125rem]"
            {...register("active")}
          />
          <span>{t("pricing.activeInCatalog")}</span>
        </label>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" className="rounded-xl shadow-none" onClick={onClose}>
            {t("common.actions.cancel")}
          </Button>
          <Button type="submit" variant="success" size="cta" className="rounded-xl shadow-none">
            {isEdit ? t("common.actions.save") : t("common.actions.create")}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

function PricingCatalogDialog({
  kind,
  open,
  onOpenChange,
  row,
}: {
  kind: CatalogKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PackageRow | ServiceRow | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border border-foreground/10" showCloseButton>
        {open ? (
          <PricingCatalogFields
            key={row?.id ?? `new-${kind}`}
            kind={kind}
            row={row}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function PricingSection({
  packages,
  services,
  loadError,
}: PricingSectionProps) {
  const { t, formatCurrency, locale } = useTranslation();
  const supabase = useSupabase();
  const { canManageFinance } = useOrganizationPermissions();
  const canEdit = canManageFinance;
  const { invalidatePricing } = useTenantDataInvalidation();

  const [packageDialog, setPackageDialog] = useState<{
    open: boolean;
    row: PackageRow | null;
  }>({ open: false, row: null });

  const [serviceDialog, setServiceDialog] = useState<{
    open: boolean;
    row: ServiceRow | null;
  }>({ open: false, row: null });

  const [deleteTarget, setDeleteTarget] = useState<{
    kind: CatalogKind;
    id: string;
    name: string;
  } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function confirmDeleteCatalog() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const { error } = await supabase
        .from(deleteTarget.kind)
        .delete()
        .eq("id", deleteTarget.id);
      if (error) {
        toast.error(t("pricing.deleteFailed"), { description: error.message });
        return;
      }
      toast.success(
        deleteTarget.kind === "packages"
          ? t("pricing.packageDeleted")
          : t("pricing.serviceDeleted"),
      );
      setDeleteTarget(null);
      invalidatePricing();
    } finally {
      setDeleteBusy(false);
    }
  }

  const catalogActionButtonClass = (isPopular: boolean) =>
    cn(
      "rounded-lg p-2.5 transition-colors",
      isPopular
        ? "bg-white/10 text-white hover:bg-white/20 hover:text-white"
        : "bg-muted text-foreground hover:bg-muted/70 hover:text-foreground",
    );

  const sortedPackages = useMemo(
    () =>
      [...packages].sort((a, b) => {
        const da = packageTierSortKey(a.name);
        const db = packageTierSortKey(b.name);
        if (da !== db) return da - db;
        return a.name.localeCompare(b.name, locale);
      }),
    [packages, locale],
  );

  const popularId = useMemo(() => {
    const plus = sortedPackages.find((p) => p.name.toLowerCase().includes("plus"));
    if (plus) return plus.id;
    if (sortedPackages.length >= 2) return sortedPackages[1]!.id;
    return sortedPackages[0]?.id ?? null;
  }, [sortedPackages]);

  const packageCardLight = cn(
    "relative flex flex-col overflow-hidden rounded-2xl bg-card p-7 ring-1 ring-foreground/20 transition-all sm:p-8 lg:min-h-[420px]",
  );
  const packageCardDark = cn(
    "relative flex flex-col overflow-hidden rounded-2xl bg-[#1a4331] p-7 text-white sm:p-8 lg:min-h-[420px]",
  );

  return (
    <div className="mx-auto flex w-full flex-col gap-8 pb-8">
      <div className="pricing-page-workspace flex w-full flex-col gap-8">
      {loadError ? (
        <div
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive md:text-app-base"
          role="alert"
        >
          {t("pricing.loadError", { error: loadError })}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col gap-8">
        <div className="pricing-page-header">
          <AppPageHeader
            className="mb-0"
            surface="default"
            title={t("pricing.title")}
            actions={
              <>
              <Link
                href="/app/settings/kontrakter#mal"
                className={cn(buttonVariants({ variant: "outline", size: "cta" }), "w-full rounded-xl shadow-none sm:w-auto")}
              >
                {t("contracts.template.title")}
              </Link>
              <Button
                type="button"
                onClick={() => setPackageDialog({ open: true, row: null })}
                disabled={!canEdit}
                title={
                  !canEdit ? t("pricing.requiresFinanceAccess") : undefined
                }
                className={cn(buttonVariants({ variant: "success", size: "cta" }), "w-full rounded-xl shadow-none sm:w-auto")}
              >
                <Plus className="size-5" aria-hidden />
                {t("pricing.newPackage")}
              </Button>
              </>
            }
          />
        </div>
        <div className="min-w-0">
          <h2 className="pricing-section-title app-section-title mb-6 md:mb-8">
            {t("pricing.packageTiers")}
          </h2>
          <div className="grid min-w-0 grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 md:gap-8 xl:grid-cols-3 xl:gap-8">
        {sortedPackages.map((pkg) => {
          const { tagline, features } = parsePackageDescription(pkg.description);
          const isPopular = pkg.id === popularId;
          const priceOnRequest = pkg.price <= 0;
          const checkClass = isPopular
            ? "text-[#85b098]"
            : "text-success";
          return (
            <div
              key={pkg.id}
              className={cn(
                isPopular ? packageCardDark : packageCardLight,
                !pkg.active && "opacity-60",
                isPopular && "z-1 md:scale-[1.02]",
              )}
            >
              <div className="mb-5 flex min-h-10 items-center justify-between gap-2">
                {canEdit ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className={catalogActionButtonClass(isPopular)}
                      title={t("pricing.editPackage")}
                      onClick={() => setPackageDialog({ open: true, row: pkg })}
                      aria-label={t("pricing.editPackageAria", { name: pkg.name })}
                    >
                      <Pencil className="size-5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={cn(
                        catalogActionButtonClass(isPopular),
                        !isPopular && "hover:text-destructive",
                        isPopular && "hover:text-red-300",
                      )}
                      title={t("pricing.deleteServiceTitleAttr")}
                      onClick={() =>
                        setDeleteTarget({
                          kind: "packages",
                          id: pkg.id,
                          name: pkg.name,
                        })
                      }
                      aria-label={t("pricing.deletePackageAria", { name: pkg.name })}
                    >
                      <Trash2 className="size-5" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <span />
                )}
                {isPopular ? (
                  <span className="rounded-full bg-amber-500 px-2.5 py-1 pricing-popular-badge font-bold tracking-wide text-stone-900">
                    {t("pricing.mostPopular")}
                  </span>
                ) : null}
              </div>
              <div>
                <span
                  className={cn(
                    "pricing-package-tier-label mb-3 block font-semibold tracking-wider uppercase",
                    isPopular ? "text-[#b9d3c4]" : "text-muted-foreground",
                  )}
                >
                  {pkg.name.toUpperCase()}
                </span>
                <div>
                  {priceOnRequest ? (
                    <p
                      className={cn(
                        "pricing-package-price-alt font-heading font-semibold leading-tight tracking-tight text-balance",
                        isPopular ? "text-white" : "text-foreground",
                      )}
                    >
                      {t("pricing.priceOnRequest")}
                    </p>
                  ) : (
                    <p
                      className={cn(
                        "pricing-package-price leading-tight",
                        isPopular ? "text-white" : "text-foreground",
                      )}
                    >
                      {formatCurrency(pkg.price)}
                    </p>
                  )}
                </div>
                {tagline ? (
                  <p
                    className={cn(
                      "pricing-package-body mt-3 leading-relaxed",
                      isPopular ? "text-[#d6e6dc]" : "text-muted-foreground",
                    )}
                  >
                    {tagline}
                  </p>
                ) : null}
              </div>
              <div
                className={cn(
                  "my-5 shrink-0 border-t",
                  isPopular ? "border-white/20" : "border-foreground/12",
                )}
              />
              {features.length > 0 ? (
                <ul
                  className={cn(
                    "pricing-package-list mb-8 flex-1 divide-y leading-snug",
                    isPopular ? "divide-white/15" : "divide-foreground/8",
                  )}
                >
                  {features.map((line, i) => (
                    <li
                      key={`${pkg.id}-${i}`}
                      className={cn(
                        "flex gap-3 py-3.5 first:pt-0 last:pb-0",
                        isPopular ? "text-white" : "text-foreground",
                      )}
                    >
                      <CheckCircle2
                        className={cn(
                          "mt-0.5 size-5 shrink-0 md:size-6",
                          checkClass,
                        )}
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  className={cn(
                    "pricing-package-body mb-8 flex-1 leading-relaxed",
                    isPopular ? "text-[#b9d3c4]" : "text-muted-foreground",
                  )}
                >
                  {t("pricing.emptyFeaturesHint")}
                </p>
              )}
            </div>
          );
        })}
      </div>

              <div className="mt-10 overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8">
                <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:px-8 md:py-6">
                  <h3 className="pricing-services-title app-section-title">
                    {t("pricing.addOnServices")}
                  </h3>
                  <Button
                    type="button"
                    onClick={() => setServiceDialog({ open: true, row: null })}
                    disabled={!canEdit}
                    title={
                      !canEdit ? t("pricing.requiresFinanceAccess") : undefined
                    }
                    className={cn(
                      buttonVariants({ variant: "success", size: "cta" }),
                      "shrink-0 self-start rounded-xl shadow-none sm:self-auto",
                    )}
                  >
                    <Plus className="size-5" aria-hidden />
                    {t("pricing.newServiceButton")}
                  </Button>
                </div>

                {services.length === 0 ? (
                  <p className="pricing-empty-services py-8 text-center text-muted-foreground md:py-12 lg:py-14">
                    {t("pricing.emptyServices")}
                  </p>
                ) : (
                  <Table>
            <TableHeader>
              <TableRow className="border-0 bg-muted/60 hover:bg-muted/60">
                <TableHead className={pricingTableHeadClass}>{t("pricing.tableService")}</TableHead>
                <TableHead className={pricingTableHeadClass}>{t("pricing.tablePrice")}</TableHead>
                <TableHead className={pricingTableHeadClass}>{t("pricing.tableStatus")}</TableHead>
                <TableHead
                  className={cn(pricingTableHeadClass, "text-right")}
                >
                  {t("pricing.tableAction")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((svc) => {
                const Icon = serviceIcon(svc.name);
                return (
                  <TableRow
                    key={svc.id}
                    className="border-foreground/6 hover:bg-muted/50"
                  >
                    <TableCell
                      className={cn(pricingTableCellClass, "whitespace-normal")}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-success md:size-12">
                          <Icon className="size-5 md:size-7" aria-hidden />
                        </div>
                        <span className={cn("pricing-service-name", APP_DATA_PRIMARY, "text-success")}>
                          {svc.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        pricingTableCellClass,
                        "whitespace-normal",
                      )}
                    >
                      <span className={cn("pricing-service-price text-app-base", APP_DATA_AMOUNT)}>
                        {formatCurrency(svc.price)}
                      </span>
                      {svc.description?.trim() ? (
                        <span className="pricing-service-desc mt-1 block">
                          {svc.description}
                        </span>
                      ) : (
                        <span className="pricing-service-desc mt-1 block">
                          {t("pricing.fixedPrice")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={pricingTableCellClass}>
                      <span
                        className={cn(
                          "pricing-service-status-pill inline-flex rounded-full px-2.5 py-1 font-semibold md:px-3 md:py-1.5",
                          svc.active
                            ? "bg-success/15 text-success"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {svc.active
                          ? statusLabel("active", t)
                          : statusLabel("inactive", t)}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(pricingTableCellClass, "text-right")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="size-11 rounded-xl text-foreground disabled:opacity-40 md:size-12"
                          disabled={!canEdit}
                          title={
                            !canEdit
                              ? t("pricing.requiresFinanceAccess")
                              : undefined
                          }
                          onClick={() =>
                            setServiceDialog({ open: true, row: svc })
                          }
                          aria-label={t("pricing.editServiceAria", { name: svc.name })}
                        >
                          <Pencil className="size-5 md:size-6" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="size-11 rounded-xl text-foreground hover:text-destructive disabled:opacity-40 md:size-12"
                          disabled={!canEdit}
                          title={
                            !canEdit
                              ? t("pricing.requiresFinanceAccess")
                              : t("pricing.deleteServiceTitleAttr")
                          }
                          onClick={() =>
                            setDeleteTarget({
                              kind: "services",
                              id: svc.id,
                              name: svc.name,
                            })
                          }
                          aria-label={t("pricing.deleteServiceAria", { name: svc.name })}
                        >
                          <Trash2 className="size-5 md:size-6" aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
                )}
              </div>
        </div>
      </div>
      </div>

      <PricingCatalogDialog
        kind="packages"
        open={packageDialog.open}
        onOpenChange={(open) => {
          if (!open) setPackageDialog({ open: false, row: null });
          else setPackageDialog((s) => ({ ...s, open: true }));
        }}
        row={packageDialog.row}
      />

      <PricingCatalogDialog
        kind="services"
        open={serviceDialog.open}
        onOpenChange={(open) => {
          if (!open) setServiceDialog({ open: false, row: null });
          else setServiceDialog((s) => ({ ...s, open: true }));
        }}
        row={serviceDialog.row}
      />

      <ConfirmDeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={
          deleteTarget?.kind === "packages"
            ? t("pricing.deletePackageTitle")
            : t("pricing.deleteServiceTitle")
        }
        description={
          deleteTarget
            ? t("pricing.deleteCatalogDescription", { name: deleteTarget.name })
            : ""
        }
        busy={deleteBusy}
        onConfirm={confirmDeleteCatalog}
      />
    </div>
  );
}
