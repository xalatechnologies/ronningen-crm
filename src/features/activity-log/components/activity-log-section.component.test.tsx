import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActivityLogSection, type ActivityLogRow } from "@/features/activity-log/components/activity-log-section";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

vi.mock("@/i18n/server", () => ({
  getServerTranslation: async () => ({
    t: createTranslator(getDictionary("nb")),
    locale: "nb",
    dictionary: getDictionary("nb"),
  }),
}));
vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const now = new Date("2026-11-23T10:00:00Z");

const rows: ActivityLogRow[] = [
  {
    id: 3,
    createdAtIso: "2026-11-23T08:15:00Z",
    actor: { name: "Eva Eier", email: "eva@x.no", role: "owner" },
    rowId: "b1",
    entry: { table_name: "bookings", op: "INSERT", changed_fields: null, old_data: null, new_data: { booking_reference: "RN-1" } },
    subject: "RN-1",
    booking: null,
  },
  {
    id: 2,
    createdAtIso: "2026-11-22T12:00:00Z",
    actor: null,
    rowId: "c1",
    entry: { table_name: "customers", op: "UPDATE", changed_fields: ["phone"], old_data: null, new_data: null },
    subject: null,
    booking: null,
  },
  {
    id: 1,
    createdAtIso: "2026-11-14T10:47:00Z",
    actor: { name: "Eva Eier", email: null, role: null },
    rowId: "i1",
    entry: { table_name: "booking_payment_installments", op: "DELETE", changed_fields: null, old_data: { label: "Depositum", amount_nok: 5000, due_date: "2026-11-21" }, new_data: null },
    subject: "Depositum",
    booking: { id: "b1", reference: "RN-1" },
  },
];

const base = { page: 1, totalPages: 1, total: 3, table: null, kind: null, now } as const;

afterEach(cleanup);

describe("ActivityLogSection", () => {
  it("groups entries under today, yesterday and a date, with who, kind and time", async () => {
    render(await ActivityLogSection({ ...base, rows }));
    expect(screen.getByRole("heading", { name: "I dag" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "I går" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "14. november 2026" })).toBeTruthy();
    expect(screen.getByText("System")).toBeTruthy();
    expect(screen.getByText("Opprettet")).toBeTruthy();
    expect(screen.getByText("Slettet")).toBeTruthy();
    expect(screen.getByText("09:15")).toBeTruthy();
    expect(screen.getByText("Viser 1–3 av 3 · Side 1 av 1")).toBeTruthy();
  });

  it("reads as a sentence: who, what they did, to what, with the person's role and the booking", async () => {
    render(await ActivityLogSection({ ...base, rows }));
    expect(screen.getByText("slettet")).toBeTruthy();
    expect(screen.getByText("en delbetaling")).toBeTruthy();
    expect(screen.getByText("«Depositum»")).toBeTruthy();
    expect(screen.getByText("en reservasjon")).toBeTruthy();
    expect(screen.getByText("eva@x.no · Hovedeier")).toBeTruthy();
    expect(screen.getByText(/Reservasjon RN-1/)).toBeTruthy();
    // The label equals the subject in the headline, so it is not repeated in the details.
    expect(screen.queryByText("Betegnelse:")).toBeNull();
    expect(screen.getByText("Beløp:")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Åpne reservasjon" }).map((a) => a.getAttribute("href"))).toEqual([
      "/app/bookings/b1",
      "/app/bookings/b1",
    ]);
  });

  it("shows the empty state without filters and a reset link with filters", async () => {
    render(await ActivityLogSection({ ...base, rows: [], total: 0 }));
    expect(screen.getByText("Ingen aktivitet ennå")).toBeTruthy();
    expect(screen.queryByText("Nullstill filter")).toBeNull();
    cleanup();

    render(await ActivityLogSection({ ...base, rows: [], total: 0, table: "bookings" }));
    expect(screen.getByText("Ingen treff")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Nullstill filter" }).getAttribute("href")).toBe("/app/settings/activity");
  });

  it("links to the next page and keeps the filters", async () => {
    render(await ActivityLogSection({ ...base, rows, total: 120, totalPages: 3, table: "bookings", kind: "created" }));
    expect(screen.getByRole("link", { name: "Neste" }).getAttribute("href")).toBe(
      "/app/settings/activity?table=bookings&kind=created&page=2",
    );
    expect(screen.queryByRole("link", { name: "Forrige" })).toBeNull();
  });
});
