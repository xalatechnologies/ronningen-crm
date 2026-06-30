"use client";

import { Button } from "@/components/ui/button";
import { completeTenantSetup } from "@/lib/organizations/actions/complete-tenant-setup";
import type { TenantSetupStep } from "@/lib/organizations/tenant-setup";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const COPY: Record<
  TenantSetupStep,
  { step: string; title: string; description: string }
> = {
  organization: {
    step: "Steg 1 av 2",
    title: "Fullfør organisasjonsprofilen",
    description:
      "Fyll inn virksomhetsinfo som brukes på fakturaer og i appen. Du kommer til lokaler i neste steg.",
  },
  lokaler: {
    step: "Steg 2 av 2",
    title: "Registrer ditt første lokale",
    description:
      "Legg til minst ett lokale for bookinger, forespørsler og økonomi. Deretter kan du bruke dashboardet.",
  },
};

export function TenantSetupBanner({
  step,
  className,
}: {
  step: TenantSetupStep;
  className?: string;
}) {
  const router = useRouter();
  const [skipping, setSkipping] = useState(false);
  const content = COPY[step];

  async function skipForNow() {
    setSkipping(true);
    try {
      const result = await completeTenantSetup();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.message("Du kan fullføre oppsettet senere under Innstillinger.");
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
        {content.step}
      </p>
      <h2 className="mt-1 font-heading text-lg font-bold text-foreground">
        {content.title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground md:text-base">
        {content.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={skipping}
          onClick={() => void skipForNow()}
        >
          {skipping ? "Lagrer …" : "Hopp over og gå til dashboard"}
        </Button>
      </div>
    </div>
  );
}
