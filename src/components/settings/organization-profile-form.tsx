"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formInputToOrganizationUpdate,
  mapOrganizationToInvoiceIssuer,
  organizationRowToFormDefaults,
  type OrganizationProfileRow,
} from "@/lib/organizations/organization-profile";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import {
  organizationProfileFormSchema,
  type OrganizationProfileFormInput,
} from "@/lib/validations";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const labelClass = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";
const fieldClass =
  "h-12 min-h-12 rounded-md border-2 border-rn-border-strong bg-background px-4 text-base focus-visible:border-success focus-visible:ring-success/25 md:h-14";

export function OrganizationProfileForm({
  organization,
}: {
  organization: OrganizationProfileRow;
}) {
  const supabase = useSupabase();
  const router = useRouter();
  const { currentOrganizationId, refreshOrganizations } =
    useCurrentOrganization();

  const form = useForm<OrganizationProfileFormInput>({
    resolver: zodResolver(organizationProfileFormSchema),
    defaultValues: organizationRowToFormDefaults(organization),
  });

  const preview = useMemo(() => {
    const values = form.watch();
    const merged: OrganizationProfileRow = {
      ...organization,
      name: values.name || organization.name,
      legal_name: values.legalName || null,
      tagline: values.tagline || null,
      org_number: values.orgNumber || null,
      address_line1: values.addressLine1 || null,
      address_line2: values.addressLine2 || null,
      postal_code: values.postalCode || null,
      city: values.city || null,
      contact_email: values.contactEmail || null,
      contact_phone: values.contactPhone || null,
      bank_account: values.bankAccount || null,
      payment_instructions: values.paymentInstructions || null,
    };
    return mapOrganizationToInvoiceIssuer(merged);
  }, [form, organization]);

  async function onSubmit(data: OrganizationProfileFormInput) {
    if (!supabase) return;
    let orgId: string;
    try {
      orgId = requireOrganizationId(currentOrganizationId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Ingen aktiv organisasjon.",
      );
      return;
    }

    const { error } = await supabase
      .from("organizations")
      .update(formInputToOrganizationUpdate(data))
      .eq("id", orgId);

    if (error) {
      toast.error("Kunne ikke lagre", { description: error.message });
      return;
    }

    toast.success("Organisasjonsprofil lagret");
    await refreshOrganizations();
    router.refresh();
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(onSubmit)();
        }}
        className={cn("flex flex-col gap-6 p-6 md:p-8", RN_CARD_SHELL)}
      >
        <div className="space-y-2">
          <Label className={labelClass} htmlFor="org-name">
            Visningsnavn
          </Label>
          <Input id="org-name" className={fieldClass} {...register("name")} />
          {errors.name ? (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label className={labelClass} htmlFor="org-legal">
            Juridisk navn (valgfritt)
          </Label>
          <Input id="org-legal" className={fieldClass} {...register("legalName")} />
        </div>

        <div className="space-y-2">
          <Label className={labelClass} htmlFor="org-tagline">
            Slagord / undertittel
          </Label>
          <Input id="org-tagline" className={fieldClass} {...register("tagline")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className={labelClass} htmlFor="org-no">
              Org.nr.
            </Label>
            <Input id="org-no" className={fieldClass} {...register("orgNumber")} />
          </div>
          <div className="space-y-2">
            <Label className={labelClass} htmlFor="org-logo">
              Logo-URL
            </Label>
            <Input id="org-logo" className={fieldClass} {...register("logoUrl")} />
            {errors.logoUrl ? (
              <p className="text-sm text-destructive">{errors.logoUrl.message}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label className={labelClass} htmlFor="org-addr1">
            Adresse
          </Label>
          <Input id="org-addr1" className={fieldClass} {...register("addressLine1")} />
        </div>
        <div className="space-y-2">
          <Label className={labelClass} htmlFor="org-addr2">
            Adresselinje 2
          </Label>
          <Input id="org-addr2" className={fieldClass} {...register("addressLine2")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className={labelClass} htmlFor="org-postal">
              Postnummer
            </Label>
            <Input id="org-postal" className={fieldClass} {...register("postalCode")} />
          </div>
          <div className="space-y-2">
            <Label className={labelClass} htmlFor="org-city">
              Poststed
            </Label>
            <Input id="org-city" className={fieldClass} {...register("city")} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className={labelClass} htmlFor="org-email">
              Kontakt e-post
            </Label>
            <Input
              id="org-email"
              type="email"
              className={fieldClass}
              {...register("contactEmail")}
            />
            {errors.contactEmail ? (
              <p className="text-sm text-destructive">
                {errors.contactEmail.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label className={labelClass} htmlFor="org-phone">
              Kontakt telefon
            </Label>
            <Input id="org-phone" className={fieldClass} {...register("contactPhone")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label className={labelClass} htmlFor="org-bank">
            Kontonummer
          </Label>
          <Input id="org-bank" className={fieldClass} {...register("bankAccount")} />
        </div>

        <div className="space-y-2">
          <Label className={labelClass} htmlFor="org-pay">
            Betalingsinstruksjoner (KID m.m.)
          </Label>
          <Textarea
            id="org-pay"
            rows={4}
            className="rounded-md border-2 border-rn-border-strong bg-background p-3 text-base focus-visible:border-success focus-visible:ring-success/25"
            {...register("paymentInstructions")}
          />
          {errors.paymentInstructions ? (
            <p className="text-sm text-destructive">
              {errors.paymentInstructions.message}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end border-t border-rn-border-strong/50 pt-4">
          <Button type="submit" variant="success" size="cta" disabled={isSubmitting}>
            {isSubmitting ? "Lagrer…" : "Lagre organisasjon"}
          </Button>
        </div>
      </form>

      <aside className={cn("p-6 md:p-8", RN_CARD_SHELL)}>
        <h2 className="font-heading text-lg font-bold text-rn-text-heading">
          Forhåndsvisning på faktura
        </h2>
        <div className="mt-4 rounded-md border-2 border-zinc-900 bg-white p-5 text-sm text-zinc-800">
          <p className="font-heading text-xl font-bold text-zinc-950">
            {preview.name}
          </p>
          <p className="mt-1 font-medium text-emerald-800">{preview.tagline}</p>
          {preview.subtitle ? (
            <p className="mt-2 text-zinc-600">{preview.subtitle}</p>
          ) : null}
          {preview.orgNo ? (
            <p className="mt-2">Org.nr {preview.orgNo}</p>
          ) : null}
          {preview.addressLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {preview.contactEmail ? <p className="mt-2">E-post: {preview.contactEmail}</p> : null}
          {preview.contactPhone ? <p>Tlf. {preview.contactPhone}</p> : null}
          <p className="mt-4 whitespace-pre-line border-t border-zinc-200 pt-3 text-zinc-700">
            {preview.bankInfo}
          </p>
        </div>
      </aside>
    </div>
  );
}
