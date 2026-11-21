"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { useOrganizationPermissions } from "@/hooks/use-organization-permissions";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import type { CatalogKind, PackageRow, ServiceRow } from "@/features/pricing/types";
import { Plus } from "lucide-react";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useTranslation } from "@/i18n/client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CatalogDialog } from "@/features/pricing/components/catalog-dialog";
import { PackageGrid } from "@/features/pricing/components/package-grid";
import { ServiceList } from "@/features/pricing/components/service-list";
import { deleteCatalogItem } from "@/features/pricing/data/catalog";
import { pickPopularPackageId, sortPackages } from "@/features/pricing/lib/package-tiers";


export type PricingSectionProps = {
  packages: PackageRow[];
  services: ServiceRow[];
  loadError: string | null;
};



export function PricingSection({
  packages,
  services,
  loadError,
}: PricingSectionProps) {
  const { t, locale } = useTranslation();
  const supabase = useSupabase();
  const { canManageFinance } = useOrganizationPermissions();
  const canEdit = canManageFinance;
  const { invalidatePricing } = useTenantDataInvalidation();

  const [packageDialog, setPackageDialog] = useState<{
    open: boolean;
    row: PackageRow | null;
    copy?: boolean;
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
      const { error } = await deleteCatalogItem(supabase, deleteTarget.kind, deleteTarget.id);
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

  const sortedPackages = useMemo(() => sortPackages(packages, locale), [packages, locale]);
  const popularId = useMemo(() => pickPopularPackageId(sortedPackages), [sortedPackages]);

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
        <PackageGrid
          packages={sortedPackages}
          popularId={popularId}
          canEdit={canEdit}
          onNew={() => setPackageDialog({ open: true, row: null })}
          onEdit={(pkg) => setPackageDialog({ open: true, row: pkg })}
          onCopy={(pkg) => setPackageDialog({ open: true, row: pkg, copy: true })}
          onDelete={(pkg) => setDeleteTarget({ kind: "packages", id: pkg.id, name: pkg.name })}
        />

        <ServiceList
          services={services}
          canEdit={canEdit}
          onNew={() => setServiceDialog({ open: true, row: null })}
          onEdit={(svc) => setServiceDialog({ open: true, row: svc })}
          onDelete={(svc) => setDeleteTarget({ kind: "services", id: svc.id, name: svc.name })}
        />
      </div>
      </div>

      <CatalogDialog
        kind="packages"
        open={packageDialog.open}
        onOpenChange={(open) => {
          if (!open) setPackageDialog({ open: false, row: null });
          else setPackageDialog((s) => ({ ...s, open: true }));
        }}
        row={packageDialog.row}
        copy={packageDialog.copy}
      />

      <CatalogDialog
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
