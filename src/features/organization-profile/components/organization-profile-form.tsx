"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, CreditCard, MapPin, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OrganizationAddressFields } from "@/features/organization-profile/components/address-fields";
import { InvoicePreview } from "@/features/organization-profile/components/invoice-preview";
import { LogoField } from "@/features/organization-profile/components/logo-field";
import { FIELD_CLASS, fieldAria, ProfileField } from "@/features/organization-profile/components/profile-field";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useTranslation } from "@/i18n/client";
import { updateOrganizationProfile } from "@/lib/organizations/actions/update-organization-profile";
import { formatBankAccount, formatOrgNumber } from "@/lib/organizations/identifiers";
import {
  formInputToOrganizationUpdate,
  mapOrganizationToInvoiceIssuer,
  organizationRowToFormDefaults,
  type OrganizationProfileRow,
} from "@/lib/organizations/organization-profile";
import { isOrganizationProfileComplete, TENANT_SETUP_LOKALER_PATH } from "@/lib/organizations/tenant-setup";
import {
  createOrganizationProfileFormSchema,
  type OrganizationProfileFormInput,
  validationMessagesForLocale,
} from "@/lib/validations";

function FormSection({ icon: Icon, title, description, children }: { icon: typeof Building2; title: string; description: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl bg-card p-5 ring-1 ring-foreground/8 md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground md:text-lg">{title}</h2>
          <p className="mt-0.5 text-app-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

/** Edit the organization profile: identity, address, contact and payment, with a live invoice preview. */
export function OrganizationProfileForm({ organization, setupMode = false }: { organization: OrganizationProfileRow; setupMode?: boolean }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { refreshOrganizations } = useCurrentOrganization();
  const schema = useMemo(() => createOrganizationProfileFormSchema(validationMessagesForLocale(locale)), [locale]);

  const form = useForm<OrganizationProfileFormInput>({
    resolver: zodResolver(schema),
    defaultValues: organizationRowToFormDefaults(organization),
    mode: "onTouched",
  });
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = form;
  const values = watch();

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const preview = useMemo(
    () =>
      mapOrganizationToInvoiceIssuer({
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
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `values` is a fresh object every render; its fields are the real inputs
    [organization, JSON.stringify(values)],
  );

  async function onSubmit(data: OrganizationProfileFormInput) {
    const result = await updateOrganizationProfile(data);
    if (!result.ok) {
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof OrganizationProfileFormInput, { message });
      }
      toast.error(result.error);
      return;
    }

    toast.success(t("settings.orgProfile.orgSaved"));
    reset(data);
    await refreshOrganizations();
    router.refresh();

    if (setupMode) {
      const saved = formInputToOrganizationUpdate(data);
      if (isOrganizationProfileComplete(saved)) router.push(TENANT_SETUP_LOKALER_PATH);
      else toast.message(t("settings.fillOrgToContinue"));
    }
  }

  const required = t("settings.orgProfile.requiredForSetup");
  const orgNumberReg = register("orgNumber");
  const bankReg = register("bankAccount");
  const showSaveBar = isDirty || setupMode;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:items-start">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(onSubmit)();
        }}
        className="flex flex-col gap-5"
      >
        <FormSection icon={Building2} title={t("settings.orgProfile.identity")} description={t("settings.orgProfile.identityDescription")}>
          <ProfileField id="org-name" label={`${t("settings.orgProfile.displayName")} *`} error={errors.name?.message}>
            <Input id="org-name" autoComplete="organization" className={FIELD_CLASS} {...fieldAria("org-name", undefined, errors.name?.message)} {...register("name")} />
          </ProfileField>

          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField id="org-legal" label={t("settings.orgProfile.legalName")} error={errors.legalName?.message}>
              <Input id="org-legal" className={FIELD_CLASS} placeholder={t("common.actions.optional")} {...register("legalName")} />
            </ProfileField>
            <ProfileField id="org-no" label={t("settings.orgProfile.orgNumber")} hint={t("settings.orgProfile.orgNumberHint")} error={errors.orgNumber?.message} tag={required}>
              <Input
                id="org-no"
                inputMode="numeric"
                autoComplete="off"
                className={FIELD_CLASS}
                {...fieldAria("org-no", t("settings.orgProfile.orgNumberHint"), errors.orgNumber?.message)}
                {...orgNumberReg}
                onBlur={(e) => {
                  void orgNumberReg.onBlur(e);
                  const formatted = formatOrgNumber(e.target.value);
                  if (formatted !== e.target.value) setValue("orgNumber", formatted, { shouldDirty: true, shouldValidate: true });
                }}
              />
            </ProfileField>
          </div>

          <ProfileField id="org-tagline" label={t("settings.orgProfile.tagline")} error={errors.tagline?.message}>
            <Input id="org-tagline" className={FIELD_CLASS} {...register("tagline")} />
          </ProfileField>

          <LogoField url={values.logoUrl ?? ""} name={values.name} error={errors.logoUrl?.message} inputProps={register("logoUrl")} />
        </FormSection>

        <FormSection icon={MapPin} title={t("settings.orgProfile.address")} description={t("settings.orgAddressDescription")}>
          <OrganizationAddressFields register={register} setValue={setValue} errors={errors} requiredTag={required} />
        </FormSection>

        <FormSection icon={Phone} title={t("settings.orgProfile.contact")} description={t("settings.contactDescription")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField id="org-email" label={t("common.fields.email")} error={errors.contactEmail?.message} tag={required}>
              <Input id="org-email" type="email" autoComplete="email" className={FIELD_CLASS} {...fieldAria("org-email", undefined, errors.contactEmail?.message)} {...register("contactEmail")} />
            </ProfileField>
            <ProfileField id="org-phone" label={t("common.fields.phone")} error={errors.contactPhone?.message} tag={required}>
              <Input id="org-phone" type="tel" autoComplete="tel" className={FIELD_CLASS} {...fieldAria("org-phone", undefined, errors.contactPhone?.message)} {...register("contactPhone")} />
            </ProfileField>
          </div>
          <p className="-mt-2 text-app-xs text-muted-foreground">{t("settings.orgProfile.contactNeedOne")}</p>
        </FormSection>

        <FormSection icon={CreditCard} title={t("settings.orgProfile.payment")} description={t("settings.paymentDescription")}>
          <ProfileField id="org-bank" label={t("settings.orgProfile.bankAccount")} hint={t("settings.orgProfile.bankAccountHint")} error={errors.bankAccount?.message}>
            <Input
              id="org-bank"
              inputMode="numeric"
              autoComplete="off"
              className={FIELD_CLASS}
              {...fieldAria("org-bank", t("settings.orgProfile.bankAccountHint"), errors.bankAccount?.message)}
              {...bankReg}
              onBlur={(e) => {
                void bankReg.onBlur(e);
                const formatted = formatBankAccount(e.target.value);
                if (formatted !== e.target.value) setValue("bankAccount", formatted, { shouldDirty: true, shouldValidate: true });
              }}
            />
          </ProfileField>
          <ProfileField id="org-pay" label={t("settings.orgProfile.paymentInstructions")} error={errors.paymentInstructions?.message}>
            <Textarea
              id="org-pay"
              rows={4}
              placeholder={t("settings.orgProfile.paymentInstructionsPlaceholder")}
              className="rounded-xl border border-foreground/25 bg-background p-3 text-base focus-visible:border-success focus-visible:ring-success/25"
              {...fieldAria("org-pay", undefined, errors.paymentInstructions?.message)}
              {...register("paymentInstructions")}
            />
          </ProfileField>
        </FormSection>

        {showSaveBar ? (
          <div
            role="region"
            aria-label={t("settings.orgProfile.unsavedChanges")}
            className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl bg-card p-3 shadow-lg ring-1 ring-foreground/15 sm:flex-row sm:items-center sm:justify-between sm:px-4"
          >
            <p className="px-1 text-app-sm font-medium text-foreground">{isDirty ? t("settings.orgProfile.unsavedChanges") : t("settings.fillOrgToContinue")}</p>
            <div className="flex gap-2">
              {isDirty ? (
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => reset()}>
                  {t("settings.orgProfile.discard")}
                </Button>
              ) : null}
              <Button type="submit" variant="success" disabled={isSubmitting} className="flex-1 sm:flex-none">
                {isSubmitting ? t("common.saving") : setupMode ? t("settings.orgProfile.saveAndContinue") : t("settings.orgProfile.saveChanges")}
              </Button>
            </div>
          </div>
        ) : null}
      </form>

      <InvoicePreview preview={preview} />
    </div>
  );
}
