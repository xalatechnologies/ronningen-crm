import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { UNKNOWN_CUSTOMER, type AccommodationReservationRow } from "@/components/overnatting/types";
import type { Locale } from "@/i18n/config";
import type { Translator } from "@/i18n/types";
import { formatAppDateFromParts } from "@/lib/format-datetime";
import { statusLabel } from "@/lib/navigation/nav-labels";
import { APP_DATA_BODY, APP_DATA_DATE, APP_DATA_PRIMARY } from "@/lib/table-typography";
import { RN_OUTLINE_BUTTON } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

const RESERVATION_TONE: Record<string, StatusTone> = {
  confirmed: "success",
  tentative: "warning",
  cancelled: "danger",
};

export function ReservationStatusBadge({ status, label }: { status: string; label: string }) {
  return <StatusBadge tone={RESERVATION_TONE[status] ?? "neutral"}>{label}</StatusBadge>;
}

/** Columns of the Overnatting reservations table. The Edit column only exists for people who can manage. */
export function buildReservationColumns({
  t,
  locale,
  canManage,
  onEdit,
}: {
  t: Translator;
  locale: Locale;
  canManage: boolean;
  onEdit: (row: AccommodationReservationRow) => void;
}): DataTableColumn<AccommodationReservationRow>[] {
  const customerName = (r: AccommodationReservationRow) =>
    r.customerName === UNKNOWN_CUSTOMER ? t("overnatting.unknownCustomer") : r.customerName;

  return [
    {
      id: "customer",
      header: t("overnatting.tableCustomer"),
      className: APP_DATA_PRIMARY,
      cell: (r) => (
        <span className="flex items-center gap-3">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-app-xs font-bold text-success dark:bg-white/10 dark:text-white"
            aria-hidden
          >
            {r.customerName === UNKNOWN_CUSTOMER ? "?" : r.customerName.trim().charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 truncate">{customerName(r)}</span>
        </span>
      ),
    },
    { id: "unit", header: t("overnatting.tableUnit"), className: APP_DATA_BODY, cell: (r) => r.unitName },
    {
      id: "arrival",
      header: t("overnatting.tableArrival"),
      className: APP_DATA_DATE,
      cell: (r) => formatAppDateFromParts(r.checkInDate, r.checkInTime, locale),
    },
    {
      id: "departure",
      header: t("overnatting.tableDeparture"),
      className: APP_DATA_DATE,
      cell: (r) => formatAppDateFromParts(r.checkOutDate, r.checkOutTime, locale),
    },
    {
      id: "guests",
      header: t("overnatting.tableGuests"),
      className: cn(APP_DATA_BODY, "tabular-nums"),
      cell: (r) => r.guestCount,
    },
    {
      id: "status",
      header: t("common.fields.status"),
      className: APP_DATA_BODY,
      cell: (r) => <ReservationStatusBadge status={r.status} label={statusLabel(r.status, t)} />,
    },
    ...(canManage
      ? [
          {
            id: "actions",
            header: t("overnatting.tableActions"),
            align: "right" as const,
            cell: (r: AccommodationReservationRow) => (
              <Button type="button" variant="outline" size="sm" className={RN_OUTLINE_BUTTON} onClick={() => onEdit(r)}>
                {t("common.actions.edit")}
              </Button>
            ),
          },
        ]
      : []),
  ];
}
