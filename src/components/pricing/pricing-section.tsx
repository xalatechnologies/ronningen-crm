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
import { useAuthUser } from "@/hooks/use-auth-user";
import { canManageFinance } from "@/lib/role-access";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import {
  pricingPackageFormSchema,
  type PricingPackageFormInput,
} from "@/lib/validations";
import { cn } from "@/lib/utils";
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
  "px-6 py-4 text-sm font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5 md:text-base";
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
  if (rawLines.length > 0 && !/^[-•*]/.test(rawLines[0]!)) {
    tagline = rawLines[0]!;
    start = 1;
  }
  const features = rawLines
    .slice(start)
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
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
      const { error } = await supabase.from(kind).insert(payload);
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
            className="h-12 rounded-xl border-2 border-rn-border-strong text-base focus-visible:border-success focus-visible:ring-success/25"
            {...register("name")}
          />
          {formState.errors.name ? (
            <p className="text-xs text-destructive">
              {formState.errors.name.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Beskrivelse / punkter</Label>
          <Textarea
            className="min-h-28 rounded-xl border-2 border-rn-border-strong text-base focus-visible:border-success focus-visible:ring-success/25"
            placeholder="Valgfri undertittel først (uten – foran), deretter ett punkt per linje med – foran."
            {...register("description")}
          />
        </div>
        <div className="space-y-2">
          <Label>Pris (NOK)</Label>
          <Input
            className="h-12 rounded-xl border-2 border-rn-border-strong text-base focus-visible:border-success focus-visible:ring-success/25"
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
          <Button
            type="submit"
            className="border-2 border-rn-accent-border bg-success text-white hover:bg-rn-accent-fill-hover"
          >
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
      <DialogContent className="max-w-md rounded-2xl" showCloseButton>
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
  const { role } = useAuthUser();
  const canEdit = canManageFinance(role);

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
    "relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl border-2 border-stone-200 bg-card p-7 shadow-sm transition-all md:p-8",
  );
  const packageCardDark = cn(
    "relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl border-2 border-stone-800 bg-stone-900 p-7 text-white shadow-xl ring-1 ring-white/10 md:p-8",
  );

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 pb-24 md:pb-8">
      <AppPageHeader
        title="Priser"
        description="Administrer pakkenivåer og tilleggstjenester. Priser brukes som referanse i katalog og ved booking."
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
            className={cn(
              buttonVariants({ variant: "default" }),
              "h-12 gap-2 rounded-xl border-2 border-rn-accent-border bg-success px-6 font-heading text-base font-bold text-white shadow-md hover:bg-rn-accent-fill-hover",
            )}
          >
            <Plus className="size-5" aria-hidden />
            Ny pakke
          </Button>
        }
      />

      {loadError ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive md:text-base"
          role="alert"
        >
          Kunne ikke laste priser: {loadError}
        </div>
      ) : null}

      <section>
        <h2 className="mb-6 font-heading text-xl font-bold tracking-tight text-rn-text-heading md:text-2xl">
          Pakkenivåer
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 xl:gap-8">
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
                <span className="absolute top-4 right-4 z-10 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold tracking-wide text-stone-900 shadow-sm md:text-xs">
                  Mest populær
                </span>
              ) : null}
              {canEdit ? (
                <button
                  type="button"
                  className={cn(
                    "absolute top-4 left-4 z-10 rounded-lg p-2.5 transition-colors",
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
                    "mb-3 block text-[11px] font-semibold tracking-wider text-stone-500 uppercase md:text-xs",
                    isPopular && "text-stone-400",
                  )}
                >
                  {pkg.name.toUpperCase()}
                </span>
                <div className="font-heading text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                  {priceOnRequest ? (
                    <span className={isPopular ? "text-white" : "text-stone-900"}>
                      Pris etter avtale
                    </span>
                  ) : (
                    <span
                      className={isPopular ? "text-white" : "text-stone-900"}
                    >
                      {formatNok(pkg.price)}
                    </span>
                  )}
                </div>
                {tagline ? (
                  <p
                    className={cn(
                      "mt-3 text-sm leading-relaxed md:text-base",
                      isPopular ? "text-stone-300" : "text-muted-foreground",
                    )}
                  >
                    {tagline}
                  </p>
                ) : null}
              </div>
              <div
                className={cn(
                  "my-5 shrink-0 border-t",
                  isPopular ? "border-white/15" : "border-stone-200",
                )}
              />
              {features.length > 0 ? (
                <ul
                  className={cn(
                    "mb-8 flex-1 divide-y text-sm leading-snug md:text-base",
                    isPopular ? "divide-white/10" : "divide-stone-200",
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
                          "mt-0.5 size-[18px] shrink-0 md:size-5",
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
                    "mb-8 flex-1 text-sm leading-relaxed md:text-base",
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
      </section>

      <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
        <div className="flex flex-col gap-3 border-b-2 border-rn-border-strong px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:px-8 md:py-6">
          <h3 className="font-heading text-xl font-bold tracking-tight text-rn-text-heading md:text-2xl">
            Tilleggstjenester
          </h3>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "h-12 gap-2 self-start rounded-xl px-4 text-base font-bold text-success hover:bg-rn-surface-row-hover hover:text-success sm:self-auto md:px-5",
            )}
            onClick={() => setServiceDialog({ open: true, row: null })}
            disabled={!canEdit}
            title={
              !canEdit
                ? "Krever eier-, admin- eller regnskapstilgang"
                : undefined
            }
          >
            <Plus className="size-5" aria-hidden />
            Ny tjeneste
          </Button>
        </div>

        {services.length === 0 ? (
          <p className="p-8 text-center text-base text-muted-foreground md:p-10 md:text-lg">
            Ingen tilleggstjenester. Aktive rader her vises som valgfrie tillegg
            på Ny booking (navn og pris kan du endre når som helst).
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
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-success/20 bg-rn-surface-gradient-from text-success md:size-11">
                          <Icon className="size-5 md:size-6" aria-hidden />
                        </div>
                        <span className="font-heading text-base font-semibold text-success md:text-lg">
                          {svc.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        pricingTableCellClass,
                        "whitespace-normal text-muted-foreground",
                      )}
                    >
                      <span className="text-base md:text-lg">
                        {formatNok(svc.price)}
                      </span>
                      {svc.description?.trim() ? (
                        <span className="mt-1 block text-sm text-muted-foreground md:text-base">
                          {svc.description}
                        </span>
                      ) : (
                        <span className="mt-1 block text-sm text-muted-foreground md:text-base">
                          Fast pris
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={pricingTableCellClass}>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase md:px-3 md:py-1.5 md:text-xs",
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
                        className="size-11 rounded-lg text-muted-foreground disabled:opacity-40 md:size-12"
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
