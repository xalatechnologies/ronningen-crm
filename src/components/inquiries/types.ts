import type { BookingInquiryStatus } from "@/lib/validations";
import type { Translator, TranslationKey } from "@/i18n/types";

export type InquiryListRow = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  propertyId: string | null;
  propertyName: string | null;
  eventType: string;
  festType: string | null;
  preferredEventDateIso: string | null;
  preferredEventEndDateIso: string | null;
  guestCount: number;
  estimatedTotal: number | null;
  status: BookingInquiryStatus;
  nextFollowUpAtIso: string | null;
  internalNotes: string | null;
  convertedBookingId: string | null;
  convertedAtIso: string | null;
  updatedAtIso: string;
};

export type InquiryActivityRow = {
  id: string;
  inquiryId: string;
  body: string;
  kind: string;
  createdAtIso: string;
};

/** Open inquiries shown in Forespørsler (excludes converted bookings). */
export function isActiveInquiry(
  row: Pick<InquiryListRow, "status" | "convertedBookingId">,
): boolean {
  return row.status !== "converted" && !row.convertedBookingId;
}

export function inquiryStatusLabel(
  status: BookingInquiryStatus,
  t: Translator,
): string {
  const keyMap: Record<BookingInquiryStatus, TranslationKey> = {
    new: "statuses.new",
    contacted: "statuses.contacted",
    quote_sent: "statuses.quoteSent",
    awaiting_customer: "statuses.awaitingCustomer",
    converted: "statuses.converted",
    lost: "statuses.lost",
  };
  return t(keyMap[status]);
}
