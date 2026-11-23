import { describe, expect, it } from "vitest";

import { entryBookingId, entryMemberUserId, entrySubject } from "@/features/activity-log/lib/entry-references";

const entry = (table_name: string, op: string, old_data: unknown, new_data: unknown) => ({
  table_name,
  op,
  changed_fields: null,
  old_data,
  new_data,
});

describe("entrySubject", () => {
  it("uses the new row for created and changed, the old row for deleted", () => {
    expect(entrySubject(entry("packages", "INSERT", null, { name: " Basis " }))).toBe("Basis");
    expect(entrySubject(entry("packages", "UPDATE", { name: "Gammel" }, { name: "Ny" }))).toBe("Ny");
    expect(entrySubject(entry("packages", "DELETE", { name: "Borte" }, null))).toBe("Borte");
  });

  it("picks the right field per table", () => {
    expect(entrySubject(entry("bookings", "INSERT", null, { booking_reference: "RN-1" }))).toBe("RN-1");
    expect(entrySubject(entry("booking_payment_installments", "INSERT", null, { label: "Depositum" }))).toBe("Depositum");
    expect(entrySubject(entry("transactions", "INSERT", null, { description: "", category: "Leie" }))).toBe("Leie");
  });

  it("gives nothing for customers, unknown tables and missing data", () => {
    expect(entrySubject(entry("customers", "INSERT", null, { name: "Ola" }))).toBeNull();
    expect(entrySubject(entry("secrets", "INSERT", null, { name: "x" }))).toBeNull();
    expect(entrySubject(entry("packages", "INSERT", null, null))).toBeNull();
  });
});

describe("related ids", () => {
  it("finds the booking of an installment only", () => {
    expect(entryBookingId(entry("booking_payment_installments", "DELETE", { booking_id: "b1" }, null))).toBe("b1");
    expect(entryBookingId(entry("transactions", "INSERT", null, { booking_id: "b1" }))).toBeNull();
  });

  it("finds the user of a team-member row only", () => {
    expect(entryMemberUserId(entry("organization_members", "UPDATE", null, { user_id: "u1" }))).toBe("u1");
    expect(entryMemberUserId(entry("bookings", "UPDATE", null, { user_id: "u1" }))).toBeNull();
  });
});
