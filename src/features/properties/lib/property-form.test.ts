import { describe, expect, it } from "vitest";

import type { PropertyListRow } from "@/components/properties/types";
import {
  propertyFormToPayload,
  propertyMatchesQuery,
  propertyRowToForm,
} from "@/features/properties/lib/property-form";

const row: PropertyListRow = {
  id: "p1",
  name: "Rønningen gård",
  address: "Baneveien 290",
  type: "gård",
  notes: "Parkering for 40 biler",
  updatedAtIso: "2026-01-01T00:00:00Z",
};

describe("propertyRowToForm", () => {
  it("fills empty text for missing values", () => {
    expect(propertyRowToForm({ ...row, address: null, notes: null })).toMatchObject({ address: "", notes: "" });
  });

  it("falls back to not specified for an unknown type", () => {
    expect(propertyRowToForm({ ...row, type: "slott" }).type).toBe("");
    expect(propertyRowToForm(row).type).toBe("gård");
  });
});

describe("propertyFormToPayload", () => {
  it("turns empty and blank text into null", () => {
    expect(propertyFormToPayload({ name: "A", address: "  ", type: "", notes: "   " })).toEqual({
      name: "A",
      address: null,
      type: null,
      notes: null,
    });
  });

  it("trims address and notes", () => {
    expect(propertyFormToPayload({ name: "A", address: " Vei 1 ", type: "gård", notes: " hei " })).toEqual({
      name: "A",
      address: "Vei 1",
      type: "gård",
      notes: "hei",
    });
  });
});

describe("propertyMatchesQuery", () => {
  it("matches everything for an empty query", () => {
    expect(propertyMatchesQuery(row, "Gård", "  ")).toBe(true);
  });

  it("matches name, address, type label and notes, ignoring case", () => {
    expect(propertyMatchesQuery(row, "Gård", "RØNN")).toBe(true);
    expect(propertyMatchesQuery(row, "Gård", "baneveien")).toBe(true);
    expect(propertyMatchesQuery(row, "Gård", "gård")).toBe(true);
    expect(propertyMatchesQuery(row, "Gård", "parkering")).toBe(true);
    expect(propertyMatchesQuery(row, "Gård", "oslo")).toBe(false);
  });
});
