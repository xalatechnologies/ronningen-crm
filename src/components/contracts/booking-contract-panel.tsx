"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { createDraft } from "@/lib/contracts/actions";
import { useTranslation } from "@/i18n/client";
import { useSupabase } from "@/providers/supabase-provider";
import type { ContractStatus } from "@/lib/contracts/types";

type VersionRow = {
  id: string;
  version_number: number;
  status: ContractStatus;
  processing_status: string;
};

export function BookingContractPanel(props: {
  organizationId: string;
  bookingId: string;
}) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const [busy, setBusy] = useState(false);
  const [versions, setVersions] = useState<VersionRow[]>([]);

  const load = useCallback(async () => {
    const { data: contract } = await supabase
      .from("rental_contracts" as never)
      .select("id")
      .eq("booking_id", props.bookingId)
      .eq("organization_id", props.organizationId)
      .maybeSingle();
    if (!contract) {
      setVersions([]);
      return;
    }
    const { data } = await supabase
      .from("rental_contract_versions" as never)
      .select("id, version_number, status, processing_status")
      .eq("contract_id", (contract as { id: string }).id)
      .order("version_number", { ascending: false });
    setVersions((data as VersionRow[] | null) ?? []);
  }, [props.bookingId, props.organizationId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = versions[0];
  const accepted = versions.find((row) => row.status === "accepted");
  const statusLabel = current
    ? t(`contracts.status.${current.status}`)
    : t("contracts.noContract");

  useEffect(() => {
    if (!current || (current.status !== "sent" && current.status !== "viewed")) return;
    const timer = window.setInterval(() => {
      void load();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [current?.id, current?.status, load]);

  async function create() {
    setBusy(true);
    try {
      const result = await createDraft({
        organizationId: props.organizationId,
        bookingId: props.bookingId,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      window.location.href = `/app/bookings/${props.bookingId}/contract`;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border-2 border-rn-border-strong/45 bg-card/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-base font-bold">{t("contracts.panelTitle")}</h3>
          <p className="text-sm text-muted-foreground">{statusLabel}</p>
        </div>
        {current ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href={`/app/bookings/${props.bookingId}/contract`}
              className={buttonVariants()}
            >
              {t("contracts.openReview")}
            </Link>
            {accepted ? (
              <a
                className={buttonVariants({ variant: "outline" })}
                href={`/api/contracts/staff-pdf?bookingId=${props.bookingId}&versionId=${accepted.id}`}
              >
                {t("contracts.downloadPdf")}
              </a>
            ) : null}
          </div>
        ) : (
          <Button type="button" onClick={() => void create()} disabled={busy}>
            {t("contracts.create")}
          </Button>
        )}
      </div>
    </section>
  );
}
