"use client";

import { AdminActionButton } from "@/components/admin/admin-action-button";
import { endImpersonation } from "@/lib/admin/actions/impersonation";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ImpersonationBanner({
  organizationName,
}: {
  organizationName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleEnd() {
    setBusy(true);
    await endImpersonation();
    setBusy(false);
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="sticky top-[length:var(--app-header-height)] z-40 border-b-2 border-amber-500/60 bg-amber-50 px-4 py-2 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-3">
        <p className="font-heading text-app-sm font-semibold md:text-app-md">
          Du ser som <strong>{organizationName}</strong> — plattformadmin-visning
        </p>
        <AdminActionButton
          type="button"
          disabled={busy}
          onClick={() => void handleEnd()}
        >
          Avslutt visning
        </AdminActionButton>
      </div>
    </div>
  );
}
