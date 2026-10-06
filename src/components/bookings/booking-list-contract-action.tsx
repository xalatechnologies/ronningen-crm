"use client";

import type { BookingListContract } from "@/components/bookings/types";
import { useTranslation } from "@/i18n/client";
import { FileDown } from "lucide-react";

const labelClass =
  "bookings-list-status-pill px-0 py-0 text-right font-bold leading-tight tracking-wide text-foreground";

export function BookingListContractAction({
  bookingId,
  contract,
}: {
  bookingId: string;
  contract: BookingListContract | null;
}) {
  const { t } = useTranslation();
  if (!contract || (contract.status !== "accepted" && contract.status !== "sent" && contract.status !== "viewed")) {
    return <span className={labelClass}>{t("contracts.listNone")}</span>;
  }

  if (contract.status === "accepted") {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className={labelClass}>{t("contracts.listAccepted")}</span>
        <a
          className={`${labelClass} inline-flex items-center gap-1 no-underline hover:underline`}
          href={`/api/contracts/staff-pdf?bookingId=${bookingId}&versionId=${contract.versionId}`}
          download="ronningen-leieavtale.pdf"
          aria-label={t("contracts.listPdfAria")}
          onClick={(event) => event.stopPropagation()}
        >
          <FileDown className="size-3.5" aria-hidden />
          {t("contracts.listPdf")}
        </a>
      </div>
    );
  }

  return <span className={labelClass}>{t("contracts.listWaiting")}</span>;
}
