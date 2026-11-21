"use client";


import { Button, buttonVariants } from "@/components/ui/button";
import { APP_DATA_AMOUNT, APP_DATA_PRIMARY } from "@/lib/table-typography";
import { cn } from "@/lib/utils";
import type { ServiceRow } from "@/features/pricing/types";
import { Camera, Music, Pencil, Plus, Puzzle, Sparkles, Trash2, UtensilsCrossed } from "lucide-react";
import { useTranslation } from "@/i18n/client";
import { statusLabel } from "@/lib/navigation/nav-labels";



/** Icon for a service, picked from words in its name. */
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

/** Add-on services as a list with add, edit and delete. */
export function ServiceList({
  services,
  canEdit,
  onNew,
  onEdit,
  onDelete,
}: {
  services: ServiceRow[];
  canEdit: boolean;
  onNew: () => void;
  onEdit: (svc: ServiceRow) => void;
  onDelete: (svc: ServiceRow) => void;
}) {
  const { t, formatCurrency } = useTranslation();
  return (
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
              onClick={() => onNew()}
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
                        onClick={() => onEdit(svc)}
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
                          onDelete(svc)
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
  );
}
