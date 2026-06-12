"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  UtensilsCrossed,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

const pricingTableHeadClass =
  "pricing-table-head px-6 py-4 font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-4";
const pricingTableCellClass = "px-6 py-5 md:px-8 md:py-6";

type PackageRow = Database["public"]["Tables"]["packages"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

export type PricingSectionProps = {
  packages: PackageRow[];
  services: ServiceRow[];
  loadError: string | null;
};

function formatNok(n: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Liste-tegn brukere skriver foran punkter (-, –, —, •, *). */
const PACKAGE_LIST_BULLET = /^[-•*–—]\s*/;

const PACKAGE_DESCRIPTION_EXAMPLE = `Perfekt for mindre selskap
– Lokale til 50 gjester
– Dekket bord og stoler
– Enkel servering`;

/** Første linje uten innledende liste-tegn (= undertittel under pakkenavn). Resten = punktliste. */
function parsePackageDescription(description: string | null): {
  tagline: string | null;
  features: string[];
} {
  if (!description?.trim()) return { tagline: null, features: [] };
  const rawLines = description
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let start = 0;
  let tagline: string | null = null;
  if (rawLines.length > 0 && !PACKAGE_LIST_BULLET.test(rawLines[0]!)) {
    tagline = rawLines[0]!;
    start = 1;
  }
  const features = rawLines
    .slice(start)
    .map((line) => line.replace(PACKAGE_LIST_BULLET, "").trim())
    .filter(Boolean);
  return { tagline, features };
}

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
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const router = useRouter();
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
        toast.error("Kunne ikke oppdatere", { description: error.message });
        return;
      }
      toast.success(
        kind === "packages" ? "Pakke oppdatert" : "Tjeneste oppdatert",
      );
    } else {
      let orgId: string;
      try {
        orgId = requireOrganizationId(currentOrganizationId);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Ingen aktiv organisasjon.",
        );
        return;
      }

      const { error } = await supabase.from(kind).insert({
        ...payload,
        organization_id: orgId,
      });
      if (error) {
        toast.error("Kunne ikke opprette", { description: error.message });
        return;
      }
      toast.success(
        kind === "packages" ? "Pakke opprettet" : "Tjeneste opprettet",
      );
    }

    onClose();
    router.refresh();
  }

  const title =
    kind === "packages"
      ? isEdit
        ? "Rediger pakke"
        : "Ny pakke"
      : isEdit
        ? "Rediger tilleggstjeneste"
        : "Ny tilleggstjeneste";

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-heading text-xl font-bold text-rn-text-heading md:text-2xl">
          {title}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>Navn</Label>
          <Input
            className="h-12 rounded-md border-2 border-rn-border-strong text-base focus-visible:border-success focus-visible:ring-success/25"
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
            {kind === "packages" ? "Beskrivelse / punkter" : "Beskrivelse"}
          </Label>
          <Textarea
            className={cn(
              "rounded-md border-2 border-rn-border-strong text-base focus-visible:border-success focus-visible:ring-success/25",
              kind === "packages" ? "min-h-36" : "min-h-28",
            )}
            placeholder={
              kind === "packages"
                ? PACKAGE_DESCRIPTION_EXAMPLE
                : "Kort beskrivelse av tilleggstjenesten"
            }
            {...register("description")}
          />
          {kind === "packages" ? (
            <p className="text-xs leading-relaxed text-muted-foreground md:text-sm">
              Første linje uten «–» blir undertittel. Linjer med «–» vises som
              punkter med hake i pakkekortet.
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Pris (NOK)</Label>
          <Input
            className="h-12 rounded-md border-2 border-rn-border-strong text-base focus-visible:border-success focus-visible:ring-success/25"
            type="number"
            min={0}
            step={100}
            {...register("price")}
          />
          {formState.errors.price ? (
            <p className="text-xs text-destructive">
              {formState.errors.price.message}
            </p>
          ) : null}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-base text-foreground">
          <input
            type="checkbox"
            className="size-4 rounded accent-success md:size-[1.125rem]"
            {...register("active")}
          />
          <span>Aktiv (synlig i katalog)</span>
        </label>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button type="submit" variant="success" size="cta">
            {isEdit ? "Lagre" : "Opprett"}
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
      <DialogContent className="max-w-md rounded-md" showCloseButton>
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
  const { canManageFinance } = useOrganizationPermissions();
  const canEdit = canManageFinance;

  const [packageDialog, setPackageDialog] = useState<{
    open: boolean;
    row: PackageRow | null;
  }>({ open: false, row: null });

  const [serviceDialog, setServiceDialog] = useState<{
    open: boolean;
    row: ServiceRow | null;
  }>({ open: false, row: null });

  const sortedPackages = useMemo(
    () =>
      [...packages].sort((a, b) => {
        const da = packageTierSortKey(a.name);
        const db = packageTierSortKey(b.name);
        if (da !== db) return da - db;
        return a.name.localeCompare(b.name, "nb");
      }),
    [packages],
  );

  const popularId = useMemo(() => {
    const plus = sortedPackages.find((p) => p.name.toLowerCase().includes("plus"));
    if (plus) return plus.id;
    if (sortedPackages.length >= 2) return sortedPackages[1]!.id;
    return sortedPackages[0]?.id ?? null;
  }, [sortedPackages]);

  const packageCardLight = cn(
    "relative flex min-h-[420px] flex-col overflow-hidden rounded-md border-2 border-rn-border-strong bg-card p-9 shadow-sm transition-all sm:p-10 md:p-11 lg:p-12",
  );
  const packageCardDark = cn(
    "relative flex min-h-[420px] flex-col overflow-hidden rounded-md border-2 border-stone-500 bg-stone-900 p-9 text-white shadow-xl ring-1 ring-white/15 sm:p-10 md:p-11 lg:p-12",
  );

  return (
    <div className="mx-auto flex w-full flex-col gap-8 pb-8">
      <div className="pricing-page-workspace flex w-full flex-col gap-8">
      {loadError ? (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive md:text-app-base"
          role="alert"
        >
          Kunne ikke laste priser: {loadError}
        </div>
      ) : null}
      <div className={cn("min-w-0 overflow-x-hidden", RN_CARD_SHELL)}>
        <div
          className={cn(
            "pricing-page-header border-b-2 border-rn-border-strong bg-card/80",
            "px-[length:var(--app-card-padding)] sm:px-[length:calc(var(--app-card-padding)+0.25rem)] md:px-[length:calc(var(--app-card-padding)+0.5rem)] lg:px-[length:calc(var(--app-card-padding)+0.75rem)]",
            "py-6 md:py-7",
          )}
        >
          <AppPageHeader
            className="mb-0"
            surface="default"
            title="Priser"
            actions={
              <Button
                type="button"
                onClick={() => setPackageDialog({ open: true, row: null })}
                disabled={!canEdit}
                title={
                  !canEdit
                    ? "Krever eier-, admin- eller regnskapstilgang"
                    : undefined
                }
                className={cn(buttonVariants({ variant: "success", size: "cta" }))}
              >
                <Plus className="size-5" aria-hidden />
                Ny pakke
              </Button>
            }
          />
        </div>
        <div className="min-w-0 px-[length:var(--app-card-padding)] py-[length:calc(var(--app-card-padding)*0.85)] sm:px-[length:calc(var(--app-card-padding)+0.25rem)] sm:py-[length:calc(var(--app-card-padding)*0.95)] md:px-[length:calc(var(--app-card-padding)+0.5rem)] md:py-[length:var(--app-card-padding)] lg:px-[length:calc(var(--app-card-padding)+0.75rem)]">
          <h2 className="pricing-section-title app-section-title mb-6 md:mb-8">
            Pakkenivåer
          </h2>
          <div className="grid min-w-0 grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 md:gap-8 xl:grid-cols-3 xl:gap-10">
        {sortedPackages.map((pkg) => {
          const { tagline, features } = parsePackageDescription(pkg.description);
          const isPopular = pkg.id === popularId;
          const priceOnRequest = pkg.price <= 0;
          const checkClass = isPopular
            ? "text-amber-400/90"
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
              {isPopular ? (
                <span className="absolute top-4 right-4 z-10 rounded-full bg-amber-500 px-2.5 py-1 pricing-popular-badge font-bold tracking-wide text-stone-900 shadow-sm">
                  Mest populær
                </span>
              ) : null}
              {canEdit ? (
                <button
                  type="button"
                  className={cn(
                    "absolute top-4 left-4 z-10 rounded-md p-2.5 transition-colors",
                    isPopular
                      ? "text-white/70 hover:bg-white/10 hover:text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  title="Rediger pakke"
                  onClick={() => setPackageDialog({ open: true, row: pkg })}
                  aria-label={`Rediger pakke ${pkg.name}`}
                >
                  <Pencil className="size-5" aria-hidden />
                </button>
              ) : null}
              <div className={cn("pr-2", canEdit && "pl-11")}>
                <span
                  className={cn(
                    "pricing-package-tier-label mb-3 block font-semibold tracking-wider text-stone-500 uppercase",
                    isPopular && "text-stone-400",
                  )}
                >
                  {pkg.name.toUpperCase()}
                </span>
                <div>
                  {priceOnRequest ? (
                    <p
                      className={cn(
                        "pricing-package-price-alt font-heading font-semibold leading-tight tracking-tight text-balance",
                        isPopular ? "text-white" : "text-stone-900",
                      )}
                    >
                      Pris etter avtale
                    </p>
                  ) : (
                    <p
                      className={cn(
                        "pricing-package-price leading-tight",
                        isPopular ? "text-white" : "text-stone-900",
                      )}
                    >
                      {formatNok(pkg.price)}
                    </p>
                  )}
                </div>
                {tagline ? (
                  <p
                    className={cn(
                      "pricing-package-body mt-3 leading-relaxed",
                      isPopular ? "text-stone-300" : "text-muted-foreground",
                    )}
                  >
                    {tagline}
                  </p>
                ) : null}
              </div>
              <div
                className={cn(
                  "my-5 shrink-0 border-t-2",
                  isPopular ? "border-white/30" : "border-rn-border-strong/70",
                )}
              />
              {features.length > 0 ? (
                <ul
                  className={cn(
                    "pricing-package-list mb-8 flex-1 divide-y leading-snug",
                    isPopular ? "divide-white/20" : "divide-rn-border-strong/55",
                  )}
                >
                  {features.map((line, i) => (
                    <li
                      key={`${pkg.id}-${i}`}
                      className={cn(
                        "flex gap-3 py-3.5 first:pt-0 last:pb-0",
                        isPopular ? "text-stone-200" : "text-foreground",
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
                    isPopular ? "text-stone-400" : "text-muted-foreground",
                  )}
                >
                  Legg inn punkter i beskrivelsen (– foran hver linje). Første
                  linje uten – blir undertittel.
                </p>
              )}
            </div>
          );
        })}
      </div>

              <div className="mt-8 border-t-2 border-rn-border-strong/80 pt-8 sm:mt-10 sm:pt-10">
                <div className="flex flex-col gap-4 border-b-2 border-rn-border-strong pb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:pb-8">
                  <h3 className="pricing-services-title app-section-title">
                    Tilleggstjenester
                  </h3>
                  <Button
                    type="button"
                    onClick={() => setServiceDialog({ open: true, row: null })}
                    disabled={!canEdit}
                    title={
                      !canEdit
                        ? "Krever eier-, admin- eller regnskapstilgang"
                        : undefined
                    }
                    className={cn(
                      buttonVariants({ variant: "success", size: "cta" }),
                      "shrink-0 self-start sm:self-auto",
                    )}
                  >
                    <Plus className="size-5" aria-hidden />
                    Ny tjeneste
                  </Button>
                </div>

                {services.length === 0 ? (
                  <p className="pricing-empty-services py-8 text-center text-muted-foreground md:py-12 lg:py-14">
                    Ingen tilleggstjenester. Aktive rader her vises som valgfrie
                    tillegg på Ny booking (navn og pris kan du endre når som
                    helst).
                  </p>
                ) : (
                  <Table>
            <TableHeader>
              <TableRow className="border-rn-border-strong/50 bg-rn-surface-table-head hover:bg-rn-surface-table-head">
                <TableHead className={pricingTableHeadClass}>Tjeneste</TableHead>
                <TableHead className={pricingTableHeadClass}>Pris</TableHead>
                <TableHead className={pricingTableHeadClass}>Status</TableHead>
                <TableHead
                  className={cn(pricingTableHeadClass, "text-right")}
                >
                  Handling
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((svc) => {
                const Icon = serviceIcon(svc.name);
                return (
                  <TableRow
                    key={svc.id}
                    className="border-rn-border-strong/40 hover:bg-rn-surface-row-hover"
                  >
                    <TableCell
                      className={cn(pricingTableCellClass, "whitespace-normal")}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-success/20 bg-rn-surface-gradient-from text-success md:size-12">
                          <Icon className="size-5 md:size-7" aria-hidden />
                        </div>
                        <span className="pricing-service-name font-heading font-semibold text-success">
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
                      <span className="pricing-service-price text-app-base tabular-nums">
                        {formatNok(svc.price)}
                      </span>
                      {svc.description?.trim() ? (
                        <span className="pricing-service-desc mt-1 block">
                          {svc.description}
                        </span>
                      ) : (
                        <span className="pricing-service-desc mt-1 block">
                          Fast pris
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={pricingTableCellClass}>
                      <span
                        className={cn(
                          "pricing-service-status-pill inline-flex rounded-full px-2.5 py-1 font-bold tracking-wide uppercase md:px-3 md:py-1.5",
                          svc.active
                            ? "border border-success/25 bg-success/15 text-success"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {svc.active ? "Aktiv" : "Inaktiv"}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(pricingTableCellClass, "text-right")}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-11 rounded-md text-muted-foreground disabled:opacity-40 md:size-12"
                        disabled={!canEdit}
                        title={
                          !canEdit
                            ? "Krever eier-, admin- eller regnskapstilgang"
                            : undefined
                        }
                        onClick={() =>
                          setServiceDialog({ open: true, row: svc })
                        }
                        aria-label={`Rediger ${svc.name}`}
                      >
                        <Pencil className="size-5 md:size-6" aria-hidden />
                      </Button>
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
    </div>
  );
}
