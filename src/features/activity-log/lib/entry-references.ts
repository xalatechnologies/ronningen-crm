import type { AuditEntryInput, AuditTableName } from "@/lib/audit/describe-audit-entry";
import { isAuditTableName } from "@/lib/audit/describe-audit-entry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** The row as it was after the change (created, changed) or before it (deleted). */
function rowData(entry: AuditEntryInput): Record<string, unknown> {
  const data = entry.op === "DELETE" ? entry.old_data : entry.new_data;
  return isRecord(data) ? data : {};
}

const SUBJECT_FIELD: Partial<Record<AuditTableName, readonly string[]>> = {
  bookings: ["booking_reference"],
  booking_payment_installments: ["label"],
  transactions: ["description", "category"],
  accommodation_units: ["name"],
  packages: ["name"],
  services: ["name"],
  assets: ["name"],
  properties: ["name"],
};

/** Short name of the thing that was touched (a reference, a label or a name), or null when there is none. */
export function entrySubject(entry: AuditEntryInput): string | null {
  if (!isAuditTableName(entry.table_name)) return null;
  const data = rowData(entry);
  for (const field of SUBJECT_FIELD[entry.table_name] ?? []) {
    const value = text(data[field]);
    if (value) return value;
  }
  return null;
}

/** The booking a row belongs to, for rows that hang under a booking (payment installments). */
export function entryBookingId(entry: AuditEntryInput): string | null {
  if (entry.table_name !== "booking_payment_installments") return null;
  return text(rowData(entry).booking_id);
}

/** The user a team-member row is about. */
export function entryMemberUserId(entry: AuditEntryInput): string | null {
  if (entry.table_name !== "organization_members") return null;
  return text(rowData(entry).user_id);
}
