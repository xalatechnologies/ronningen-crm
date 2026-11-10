import type { AccommodationReservationStatus } from "@/lib/validations";
import type { Translator, TranslationKey } from "@/i18n/types";

export function accommodationReservationLabel(
  status: AccommodationReservationStatus,
  t: Translator,
): string {
  const keyMap: Record<AccommodationReservationStatus, TranslationKey> = {
    tentative: "statuses.tentative",
    confirmed: "statuses.confirmed",
    cancelled: "statuses.cancelled",
  };
  return t(keyMap[status]);
}

export type AccommodationUnitRow = {
  id: string;
  name: string;
  propertyId: string | null;
  propertyName: string | null;
  maxGuests: number;
  notes: string | null;
  active: boolean;
  sortOrder: number;
};

export type AccommodationReservationRow = {
  id: string;
  unitId: string;
  unitName: string;
  customerId: string;
  customerName: string;
  checkInDate: string;
  checkOutDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: AccommodationReservationStatus;
  guestCount: number;
  notes: string | null;
  totalPrice: number | null;
};
