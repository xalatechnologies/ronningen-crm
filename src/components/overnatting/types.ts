import type { AccommodationReservationStatus } from "@/lib/validations";

export const ACCOMMODATION_RESERVATION_LABELS: Record<
  AccommodationReservationStatus,
  string
> = {
  tentative: "Foreløpig",
  confirmed: "Bekreftet",
  cancelled: "Kansellert",
};

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
