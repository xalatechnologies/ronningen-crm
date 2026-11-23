import type { PropertyListRow } from "@/components/properties/types";
import { PROPERTY_TYPES, type PropertyFormInput } from "@/lib/validations";

export const EMPTY_PROPERTY_FORM: PropertyFormInput = { name: "", address: "", type: "", notes: "" };

/** Turns a saved row into form values. Unknown types become "not specified". */
export function propertyRowToForm(row: PropertyListRow): PropertyFormInput {
  const type = row.type ?? "";
  const known = (PROPERTY_TYPES as readonly string[]).includes(type);
  return {
    name: row.name,
    address: row.address ?? "",
    type: known ? (type as PropertyFormInput["type"]) : "",
    notes: row.notes ?? "",
  };
}

/** Turns form values into the database columns: empty text becomes null. */
export function propertyFormToPayload(data: PropertyFormInput) {
  return {
    name: data.name,
    address: data.address.trim() || null,
    type: data.type || null,
    notes: data.notes?.trim() || null,
  };
}

/** True when the search text appears in the name, address, type label or notes. */
export function propertyMatchesQuery(row: PropertyListRow, typeLabel: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.name, row.address ?? "", typeLabel, row.notes ?? ""].join(" ").toLowerCase().includes(q);
}
