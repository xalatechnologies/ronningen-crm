/**
 * Pure helpers for booking detail customer edit detection / shared-link counts.
 * Kept separate so address-only and accommodation-linked warnings stay regression-tested.
 */

export type BookingCustomerSnapshot = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export type BookingCustomerEditInput = {
  customerName: string;
  phone: string;
  email: string;
  address: string;
};

export function bookingCustomerFieldsChanged(
  data: BookingCustomerEditInput,
  current: BookingCustomerSnapshot,
): boolean {
  const nameChanged = data.customerName.trim() !== current.name.trim();
  const phoneChanged =
    (data.phone.trim() || null) !== (current.phone ?? null);
  const emailChanged =
    (data.email.trim() || null) !== (current.email ?? null);
  const addressChanged =
    (data.address.trim() || null) !== (current.address ?? null);
  return nameChanged || phoneChanged || emailChanged || addressChanged;
}

export function sharedCustomerLinkTotal(counts: {
  bookings: number;
  inquiries: number;
  accommodation: number;
}): number {
  return counts.bookings + counts.inquiries + counts.accommodation;
}
