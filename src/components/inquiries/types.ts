import type { BookingInquiryStatus } from "@/lib/validations";

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

export const INQUIRY_STATUS_LABELS: Record<BookingInquiryStatus, string> = {
  new: "Ny",
  contacted: "Kontaktet",
  quote_sent: "Tilbud sendt",
  awaiting_customer: "Venter på svar",
  converted: "Konvertert til reservasjon",
  lost: "Tapt",
};
