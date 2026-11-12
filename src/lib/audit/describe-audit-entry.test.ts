import { describe, expect, it } from "vitest";

import { describeAuditEntry, formatAuditValue } from "./describe-audit-entry";

const base = {
  changed_fields: null,
  old_data: null,
  new_data: null,
};

describe("describeAuditEntry", () => {
  it("describes a booking update as formatted change lines", () => {
    const d = describeAuditEntry(
      {
        ...base,
        table_name: "bookings",
        op: "UPDATE",
        changed_fields: ["status", "paid_amount", "updated_at"],
        old_data: { status: "pending", paid_amount: 0 },
        new_data: { status: "confirmed", paid_amount: 1500 },
      },
      "en",
    );
    expect(d.kind).toBe("changed");
    expect(d.table).toBe("bookings");
    expect(d.changes.map((c) => c.fieldKey)).toEqual(["status", "paid_amount"]);
    expect(d.changes[0]).toMatchObject({ oldValue: "pending", newValue: "confirmed" });
    expect(d.changes[1].newValue).toMatch(/1[\s, ]?500/);
    expect(d.changes[1].newValue).toMatch(/NOK/);
  });

  it("shows only field names for redacted customers", () => {
    const d = describeAuditEntry(
      {
        ...base,
        table_name: "customers",
        op: "UPDATE",
        changed_fields: ["phone", "name"],
        old_data: { phone: "secret" },
        new_data: { phone: "secret2" },
      },
      "nb",
    );
    expect(d.redacted).toBe(true);
    expect(d.changes).toEqual([]);
    expect(d.changedFieldKeys).toEqual(["phone", "name"]);
  });

  it("summarizes inserted and deleted bookings", () => {
    const created = describeAuditEntry(
      {
        ...base,
        table_name: "bookings",
        op: "INSERT",
        new_data: { booking_reference: "B-1", status: "pending", notes: "x" },
      },
      "nb",
    );
    expect(created.kind).toBe("created");
    expect(created.summary).toEqual([
      { fieldKey: "booking_reference", value: "B-1" },
      { fieldKey: "status", value: "pending" },
    ]);

    const deleted = describeAuditEntry(
      { ...base, table_name: "bookings", op: "DELETE", old_data: { status: "x" } },
      "nb",
    );
    expect(deleted.kind).toBe("deleted");
  });

  it("shows what a deleted inquiry was", () => {
    const deleted = describeAuditEntry(
      {
        ...base,
        table_name: "booking_inquiries",
        op: "DELETE",
        old_data: {
          event_type: "Privat",
          preferred_event_date: "2027-03-13",
          guest_count: 100,
          estimated_total: 43000,
          status: "new",
          internal_notes: "not shown",
        },
      },
      "nb",
    );
    expect(deleted.kind).toBe("deleted");
    expect(deleted.table).toBe("booking_inquiries");
    expect(deleted.summary.map((s) => s.fieldKey)).toEqual([
      "event_type",
      "preferred_event_date",
      "guest_count",
      "estimated_total",
      "status",
    ]);
  });

  it("never throws on missing or unexpected data", () => {
    const d = describeAuditEntry(
      {
        table_name: "mystery",
        op: "UPDATE",
        changed_fields: ["a"],
        old_data: "oops",
        new_data: [1],
      },
      "en",
    );
    expect(d.table).toBeNull();
    expect(d.changes).toEqual([{ fieldKey: "a", oldValue: "—", newValue: "—" }]);
    expect(
      describeAuditEntry(
        { table_name: "bookings", op: "INSERT", changed_fields: null, old_data: undefined, new_data: undefined },
        "en",
      ).summary,
    ).toEqual([]);
  });
});

describe("formatAuditValue", () => {
  it("formats null, booleans and dates", () => {
    expect(formatAuditValue("x", null, "nb")).toBe("—");
    expect(formatAuditValue("x", true, "nb")).toBe("Ja");
    expect(formatAuditValue("x", false, "en")).toBe("No");
    expect(formatAuditValue("event_date", "2026-08-28", "en")).toContain("2026");
  });

  it("renders timestamps in Europe/Oslo", () => {
    expect(formatAuditValue("x", "2026-07-01T10:00:00Z", "en")).toContain("12:00");
  });

  it("truncates long text", () => {
    expect(formatAuditValue("notes", "a".repeat(200), "en").length).toBeLessThanOrEqual(80);
  });
});
