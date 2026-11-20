"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  getPackageContractTemplate,
  listTemplates,
  setPackageContractTemplate,
} from "@/lib/contracts/templates";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { APP_DATA_AMOUNT, APP_DATA_PRIMARY } from "@/lib/table-typography";
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
  Copy,
  Music,
  Pencil,
  Plus,
  Puzzle,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useTranslation } from "@/i18n/client";
import { useEffect, useMemo, useRef, useState } from "react";
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

const FEATURE_BULLET = /^[-•*–—]\s*/;

const dialogFieldClass =
  "h-12 rounded-xl border border-foreground/25 bg-background px-4 text-base shadow-none hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20";

function FeatureListEditor({
  features,
  onChange,
}: {
  features: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);

  function focusRow(index: number) {
    window.setTimeout(() => {
      listRef.current
        ?.querySelectorAll<HTMLInputElement>("input[data-feature-input]")
        [index]?.focus();
    }, 0);
  }

  return (
    <div className="space-y-2">
      <Label>{t("pricing.featuresLabel")}</Label>
      <div ref={listRef} className="space-y-2">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2">
            <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
            <Input
              data-feature-input
              value={feature}
              placeholder={t("pricing.featurePlaceholder")}
              className={cn(dialogFieldClass, "h-11")}
              onChange={(e) =>
                onChange(features.map((f, i) => (i === index ? e.target.value : f)))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const next = [...features];
                  next.splice(index + 1, 0, "");
                  onChange(next);
                  focusRow(index + 1);
                } else if (e.key === "Backspace" && feature === "" && features.length > 1) {
                  e.preventDefault();
                  onChange(features.filter((_, i) => i !== index));
                  focusRow(Math.max(0, index - 1));
                }
              }}
            />
            <button
              type="button"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label={t("pricing.removeFeatureAria", { number: index + 1 })}
              onClick={() => {
                const next = features.filter((_, i) => i !== index);
                onChange(next.length > 0 ? next : [""]);
              }}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 rounded-xl shadow-none"
        onClick={() => {
          onChange([...features, ""]);
          focusRow(features.length);
        }}
      >
        <Plus className="size-4" aria-hidden />
        {t("pricing.addFeature")}
      </Button>
      <p className="text-xs text-muted-foreground">{t("pricing.featuresHint")}</p>
    </div>
  );
}

function PricingCatalogFields({
  kind,
  row,
  copy = false,
  onClose,
}: {
  kind: CatalogKind;
  row: PackageRow | ServiceRow | null;
  /** Prefill from `row`, but save as a new item. */
  copy?: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const { invalidatePricing } = useTenantDataInvalidation();
  const isEdit = row != null && !copy;

  const form = useForm<PricingPackageFormInput>({
    resolver: zodResolver(
      pricingPackageFormSchema,
    ) as Resolver<PricingPackageFormInput>,
    defaultValues: {
      name: row ? (copy ? `${row.name} (${t("pricing.copySuffix")})` : row.name) : "",
      description: row?.description ?? "",
      price: row?.price ?? 0,
      active: row?.active ?? true,
    },
  });

  const { register, handleSubmit, formState } = form;

  const parsedDescription = useMemo(
    () => parsePackageDescription(row?.description),
    [row?.description],
  );
  const [tagline, setTagline] = useState(parsedDescription.tagline ?? "");
  const [features, setFeatures] = useState<string[]>(
    parsedDescription.features.length > 0 ? parsedDescription.features : [""],
  );

  const [templates, setTemplates] = useState<{ id: string; name: string; isDefault: boolean }[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [initialTemplateId, setInitialTemplateId] = useState("");
  useEffect(() => {
    if (kind !== "packages" || !row || copy || !currentOrganizationId) return;
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
  }, [kind, row, copy, currentOrganizationId]);

  async function onSubmit(data: PricingPackageFormInput) {
    const packageDescription = [
      tagline.trim(),
      ...features
        .map((f) => f.trim().replace(FEATURE_BULLET, "").trim())
        .filter(Boolean)
        .map((f) => `– ${f}`),
    ]
      .filter(Boolean)
      .join("\n");
    const payload = {
      name: data.name.trim(),
      description:
        kind === "packages"
          ? packageDescription || null
          : data.description?.trim() || null,
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
        {kind === "packages" ? (
          <>
            <div className="space-y-2">
              <Label>{t("pricing.priceNok")}</Label>
              <PriceInput className={dialogFieldClass} {...register("price")} />
              {formState.errors.price ? (
                <p className="text-xs text-destructive">{formState.errors.price.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>{t("pricing.taglineLabel")}</Label>
              <Input
                className={dialogFieldClass}
                value={tagline}
                placeholder={t("pricing.taglinePlaceholder")}
                onChange={(e) => setTagline(e.target.value)}
              />
            </div>
            <FeatureListEditor features={features} onChange={setFeatures} />
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>{t("pricing.descriptionServices")}</Label>
              <Textarea
                className="min-h-28 rounded-xl border border-foreground/25 bg-background p-4 text-base shadow-none hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20"
                placeholder={t("pricing.descriptionServicesPlaceholder")}
                {...register("description")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("pricing.priceNok")}</Label>
              <PriceInput className={dialogFieldClass} {...register("price")} />
              {formState.errors.price ? (
                <p className="text-xs text-destructive">{formState.errors.price.message}</p>
              ) : null}
            </div>
          </>
        )}
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
  copy = false,
}: {
  kind: CatalogKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PackageRow | ServiceRow | null;
  copy?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] max-w-md overflow-y-auto rounded-2xl border border-foreground/10 sm:max-w-lg"
        showCloseButton
      >
        {open ? (
          <PricingCatalogFields
            key={`${row?.id ?? `new-${kind}`}-${copy ? "copy" : "edit"}`}
            kind={kind}
            row={row}
            copy={copy}
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
    copy?: boolean;
  }>({ open: false, row: null });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
        <section className="min-w-0" aria-labelledby="pricing-packages-title">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="pricing-packages-title" className="pricing-section-title app-section-title">
              {t("pricing.packageTiers")}
            </h2>
            <p className="text-app-sm text-muted-foreground">
              {t("pricing.packagesCount", { count: sortedPackages.length })}
            </p>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sortedPackages.map((pkg) => {
              const { tagline, features } = parsePackageDescription(pkg.description);
              const isPopular = pkg.id === popularId;
              const priceOnRequest = pkg.price <= 0;
              const expanded = expandedIds.has(pkg.id);
              const LIMIT = 6;
              const shown = expanded ? features : features.slice(0, LIMIT);
              const hidden = features.length - LIMIT;
              const footerBtn = isPopular
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-muted text-foreground hover:bg-muted/70";
              return (
                <article
                  key={pkg.id}
                  className={cn(
                    "relative flex h-full flex-col rounded-2xl p-6 sm:p-7",
                    isPopular ? "bg-[#1a4331] text-white" : "bg-card ring-1 ring-foreground/15",
                    !pkg.active && "opacity-70",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={cn(
                        "pricing-package-tier-label min-w-0 break-words font-heading font-bold",
                        isPopular ? "text-[#d6e6dc]" : "text-foreground",
                      )}
                    >
                      {pkg.name}
                    </h3>
                    {isPopular ? (
                      <span className="pricing-popular-badge rounded-full bg-amber-500 px-2.5 py-0.5 font-bold text-stone-900">
                        {t("pricing.mostPopular")}
                      </span>
                    ) : null}
                    {!pkg.active ? (
                      <span
                        className={cn(
                          "pricing-popular-badge rounded-full px-2.5 py-0.5 font-semibold",
                          isPopular ? "bg-white/15 text-white" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {statusLabel("inactive", t)}
                      </span>
                    ) : null}
                  </div>

                  <p
                    className={cn(
                      "mt-4 leading-tight",
                      priceOnRequest
                        ? "pricing-package-price-alt font-heading font-semibold"
                        : "pricing-package-price",
                      isPopular ? "text-white" : "text-foreground",
                    )}
                  >
                    {priceOnRequest ? t("pricing.priceOnRequest") : formatCurrency(pkg.price)}
                  </p>
                  {tagline ? (
                    <p
                      className={cn(
                        "pricing-package-body mt-2 leading-relaxed",
                        isPopular ? "text-[#d6e6dc]" : "text-muted-foreground",
                      )}
                    >
                      {tagline}
                    </p>
                  ) : null}

                  <div
                    className={cn("my-5 shrink-0 border-t", isPopular ? "border-white/20" : "border-foreground/12")}
                  />

                  <div className="flex-1">
                    {features.length > 0 ? (
                      <>
                        <ul className="pricing-package-list space-y-2.5">
                          {shown.map((line, i) => (
                            <li key={`${pkg.id}-${i}`} className="flex gap-2.5">
                              <CheckCircle2
                                className={cn(
                                  "mt-0.5 size-5 shrink-0",
                                  isPopular ? "text-[#85b098]" : "text-success",
                                )}
                                aria-hidden
                              />
                              <span className="min-w-0 break-words">{line}</span>
                            </li>
                          ))}
                        </ul>
                        {hidden > 0 ? (
                          <button
                            type="button"
                            className={cn(
                              "mt-3 text-app-sm font-semibold underline-offset-4 hover:underline",
                              isPopular ? "text-[#b9d3c4]" : "text-success",
                            )}
                            onClick={() =>
                              setExpandedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(pkg.id)) next.delete(pkg.id);
                                else next.add(pkg.id);
                                return next;
                              })
                            }
                          >
                            {expanded
                              ? t("pricing.showFewerFeatures")
                              : t("pricing.showAllFeatures", { count: features.length })}
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <p
                        className={cn(
                          "pricing-package-body leading-relaxed",
                          isPopular ? "text-[#b9d3c4]" : "text-muted-foreground",
                        )}
                      >
                        {t("pricing.emptyFeaturesHint")}
                      </p>
                    )}
                  </div>

                  {canEdit ? (
                    <div className="mt-6 flex items-center gap-2">
                      <button
                        type="button"
                        className={cn(
                          "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-app-sm font-semibold transition-colors",
                          footerBtn,
                        )}
                        onClick={() => setPackageDialog({ open: true, row: pkg })}
                        aria-label={t("pricing.editPackageAria", { name: pkg.name })}
                      >
                        <Pencil className="size-4" aria-hidden />
                        {t("common.actions.edit")}
                      </button>
                      <button
                        type="button"
                        className={cn("flex size-11 items-center justify-center rounded-xl transition-colors", footerBtn)}
                        title={t("pricing.duplicatePackage")}
                        aria-label={t("pricing.duplicatePackageAria", { name: pkg.name })}
                        onClick={() => setPackageDialog({ open: true, row: pkg, copy: true })}
                      >
                        <Copy className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "flex size-11 items-center justify-center rounded-xl transition-colors",
                          footerBtn,
                          isPopular ? "hover:text-red-300" : "hover:text-destructive",
                        )}
                        title={t("pricing.deleteServiceTitleAttr")}
                        aria-label={t("pricing.deletePackageAria", { name: pkg.name })}
                        onClick={() =>
                          setDeleteTarget({ kind: "packages", id: pkg.id, name: pkg.name })
                        }
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}

            {canEdit ? (
              <button
                type="button"
                onClick={() => setPackageDialog({ open: true, row: null })}
                className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-foreground/20 bg-transparent p-6 text-muted-foreground transition-colors hover:border-success/60 hover:bg-card hover:text-success"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <Plus className="size-6" aria-hidden />
                </span>
                <span className="text-app-base font-semibold">{t("pricing.newPackage")}</span>
                <span className="text-app-xs">{t("pricing.addPackageHint")}</span>
              </button>
            ) : null}
          </div>
        </section>

        <section
          className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8"
          aria-labelledby="pricing-services-title"
        >
          <div className="flex flex-col gap-3 border-b border-foreground/8 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
            <div className="min-w-0">
              <h3 id="pricing-services-title" className="pricing-services-title app-section-title">
                {t("pricing.addOnServices")}
              </h3>
              <p className="mt-0.5 text-app-sm text-muted-foreground">
                {t("pricing.servicesCount", { count: services.length })}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setServiceDialog({ open: true, row: null })}
              disabled={!canEdit}
              title={!canEdit ? t("pricing.requiresFinanceAccess") : undefined}
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
            <p className="pricing-empty-services px-6 py-10 text-center text-muted-foreground">
              {t("pricing.emptyServices")}
            </p>
          ) : (
            <ul className="divide-y divide-foreground/8">
              {services.map((svc) => {
                const Icon = serviceIcon(svc.name);
                return (
                  <li
                    key={svc.id}
                    className={cn("flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-6", !svc.active && "opacity-70")}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className={cn("pricing-service-name min-w-0 break-words", APP_DATA_PRIMARY)}>
                          {svc.name}
                        </span>
                        {!svc.active ? (
                          <span className="pricing-service-status-pill rounded-full bg-muted px-2 py-0.5 font-semibold text-muted-foreground">
                            {statusLabel("inactive", t)}
                          </span>
                        ) : null}
                      </div>
                      <p className="pricing-service-desc mt-0.5 line-clamp-2 text-muted-foreground">
                        {svc.description?.trim() ? svc.description : t("pricing.fixedPrice")}
                      </p>
                    </div>
                    <span className={cn("pricing-service-price shrink-0 tabular-nums", APP_DATA_AMOUNT)}>
                      {formatCurrency(svc.price)}
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-10 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40"
                        disabled={!canEdit}
                        title={!canEdit ? t("pricing.requiresFinanceAccess") : undefined}
                        onClick={() => setServiceDialog({ open: true, row: svc })}
                        aria-label={t("pricing.editServiceAria", { name: svc.name })}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-10 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                        disabled={!canEdit}
                        title={
                          !canEdit
                            ? t("pricing.requiresFinanceAccess")
                            : t("pricing.deleteServiceTitleAttr")
                        }
                        onClick={() =>
                          setDeleteTarget({ kind: "services", id: svc.id, name: svc.name })
                        }
                        aria-label={t("pricing.deleteServiceAria", { name: svc.name })}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
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
        copy={packageDialog.copy}
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
