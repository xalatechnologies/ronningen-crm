"use client";


import { Button } from "@/components/ui/button";
import { getPackageContractTemplate, listTemplates, setPackageContractTemplate } from "@/lib/contracts/templates";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { pricingPackageFormSchema, type PricingPackageFormInput } from "@/lib/validations";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import type { CatalogKind, PackageRow, ServiceRow } from "@/features/pricing/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useTranslation } from "@/i18n/client";
import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { createCatalogItem, toCatalogPayload, updateCatalogItem } from "@/features/pricing/data/catalog";
import { buildPackageDescription } from "@/features/pricing/lib/package-description";
import { parsePackageDescription } from "@/lib/pricing/parse-package-description";


import { FeatureListEditor, dialogFieldClass } from "@/features/pricing/components/feature-list-editor";

export function CatalogFields({
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
    const packageDescription = buildPackageDescription(tagline, features);
    const payload = toCatalogPayload(kind, data, packageDescription);

    if (isEdit && row) {
      const { error } = await updateCatalogItem(supabase, kind, row.id, payload);
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

      const { error } = await createCatalogItem(supabase, kind, orgId, payload);
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
