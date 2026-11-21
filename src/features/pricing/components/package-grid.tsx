"use client";


import { cn } from "@/lib/utils";
import type { PackageRow } from "@/features/pricing/types";
import { CheckCircle2, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "@/i18n/client";
import { useState } from "react";
import { parsePackageDescription } from "@/lib/pricing/parse-package-description";
import { statusLabel } from "@/lib/navigation/nav-labels";



/** Package cards (price, tagline, included points, edit / copy / delete) and the add-package card. */
export function PackageGrid({
  packages,
  popularId,
  canEdit,
  onNew,
  onEdit,
  onCopy,
  onDelete,
}: {
  packages: PackageRow[];
  popularId: string | null;
  canEdit: boolean;
  onNew: () => void;
  onEdit: (pkg: PackageRow) => void;
  onCopy: (pkg: PackageRow) => void;
  onDelete: (pkg: PackageRow) => void;
}) {
  const { t, formatCurrency } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const sortedPackages = packages;
  return (
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
                    isPopular ? "bg-success text-white" : "bg-card ring-1 ring-foreground/15",
                    !pkg.active && "opacity-70",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={cn(
                        "pricing-package-tier-label min-w-0 break-words font-heading font-bold",
                        isPopular ? "text-white/90" : "text-foreground",
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
                        isPopular ? "text-white/90" : "text-muted-foreground",
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
                                  isPopular ? "text-white/80" : "text-success",
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
                              isPopular ? "text-white/80" : "text-success",
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
                          isPopular ? "text-white/80" : "text-muted-foreground",
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
                        onClick={() => onEdit(pkg)}
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
                        onClick={() => onCopy(pkg)}
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
                          onDelete(pkg)
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
                onClick={() => onNew()}
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
  );
}
