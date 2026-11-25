"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useTranslation } from "@/i18n/client";
import {
  isBillingEnabled,
  SAAS_MONTHLY_PRICE_NOK,
  SAAS_TRIAL_DAYS,
} from "@/lib/billing/constants";
import { triggerWelcomeNotification } from "@/lib/notifications/actions/welcome";
import {
  createOrganizationForUser,
  toOrganizationError,
} from "@/lib/organizations/organization-queries";
import { useSupabase } from "@/providers/supabase-provider";

export function CreateOrganizationForm() {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const { user, loading: authLoading } = useAuthUser();
  const { refreshOrganizations } = useCurrentOrganization();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authLoading) return;
    if (!user) {
      toast.error(t("organizations.mustBeLoggedIn"));
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t("organizations.nameRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const { organization: org, created } = await createOrganizationForUser(
        supabase,
        user.id,
        trimmed,
      );
      await refreshOrganizations();
      toast.success(t("organizations.created"));

      if (created) {
        void triggerWelcomeNotification({ organizationName: org.name });
      }

      window.location.assign("/app/settings/organization");
    } catch (error) {
      toast.error(
        toOrganizationError(error, t("organizations.createFailed")).message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => void handleSubmit(e)}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="organization-name" className="text-app-sm font-medium text-foreground">
          {t("organizations.nameLabel")}
        </Label>
        <Input
          id="organization-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("organizations.namePlaceholder")}
          autoComplete="organization"
          aria-describedby="organization-name-hint"
          autoFocus
          disabled={submitting}
          className="h-11 rounded-lg border border-input bg-background text-app-base shadow-xs focus-visible:border-success focus-visible:ring-success/25"
        />
        <p id="organization-name-hint" className="text-app-sm text-muted-foreground">
          {t("appPages.onboarding.nameHint")}
        </p>
      </div>
      <Button type="submit" size="cta" disabled={submitting || authLoading}>
        {submitting
          ? t("organizations.creating")
          : authLoading
            ? t("common.actions.loading")
            : t("appPages.onboarding.continue")}
      </Button>
      {isBillingEnabled() ? (
        <p className="text-app-sm text-muted-foreground">
          {t("organizations.trialHint", {
            days: SAAS_TRIAL_DAYS,
            price: SAAS_MONTHLY_PRICE_NOK,
          })}
        </p>
      ) : null}
    </form>
  );
}
