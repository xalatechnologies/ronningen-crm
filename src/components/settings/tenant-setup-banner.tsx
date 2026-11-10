"use client";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";
import { completeTenantSetup } from "@/lib/organizations/actions/complete-tenant-setup";
import type { TenantSetupStep } from "@/lib/organizations/tenant-setup";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function TenantSetupBanner({
  step,
  className,
}: {
  step: TenantSetupStep;
  className?: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [skipping, setSkipping] = useState(false);

  const stepLabel =
    step === "organization" ? t("settings.setup.step1") : t("settings.setup.step2");
  const title =
    step === "organization"
      ? t("settings.completeProfile.title")
      : t("settings.registerVenue.title");
  const description =
    step === "organization"
      ? t("settings.completeProfile.description")
      : t("settings.registerVenue.description");

  async function skipForNow() {
    setSkipping(true);
    try {
      const result = await completeTenantSetup();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.message(t("settings.skipSetup"));
      router.push("/app/dashboard");
      router.refresh();
    } finally {
      setSkipping(false);
    }
  }

  return (
    <div
      className={cn(
        "border-2 border-success/40 bg-success/5 px-5 py-4 md:px-6",
        RN_CARD_SHELL,
        className,
      )}
      role="status"
    >
      <p className="text-app-xs font-semibold uppercase tracking-wider text-success">
        {stepLabel}
      </p>
      <h2 className="mt-1 font-heading text-lg font-bold text-foreground">
        {title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground md:text-base">
        {description}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={skipping}
          onClick={() => void skipForNow()}
        >
          {skipping ? t("settings.skipping") : t("settings.skipToDashboard")}
        </Button>
      </div>
    </div>
  );
}
