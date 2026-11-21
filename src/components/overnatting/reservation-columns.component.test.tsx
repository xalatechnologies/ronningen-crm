import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DataTable } from "@/components/ui/data-table";
import { buildReservationColumns } from "@/components/overnatting/reservation-columns";
import { UNKNOWN_CUSTOMER, type AccommodationReservationRow } from "@/components/overnatting/types";
import type { Translator } from "@/i18n/types";

const t = ((key: string) => key) as unknown as Translator;

const base: AccommodationReservationRow = {
  id: "r1",
  unitId: "u1",
  unitName: "Leilighet A",
  customerId: "c1",
  customerName: "Kari Nordmann",
  checkInDate: "2026-11-10",
  checkOutDate: "2026-11-12",
  checkInTime: null,
  checkOutTime: null,
  status: "confirmed",
  guestCount: 3,
  notes: null,
  totalPrice: null,
};

function renderTable(canManage: boolean, rows: AccommodationReservationRow[], onEdit = vi.fn()) {
  const columns = buildReservationColumns({ t, locale: "nb", canManage, onEdit });
  render(<DataTable rows={rows} getRowKey={(r) => r.id} columns={columns} />);
  return { columns, onEdit };
}

describe("buildReservationColumns", () => {
  afterEach(cleanup);

  it("adds the Edit column only when the user can manage", () => {
    expect(buildReservationColumns({ t, locale: "nb", canManage: false, onEdit: vi.fn() })).toHaveLength(6);
    expect(buildReservationColumns({ t, locale: "nb", canManage: true, onEdit: vi.fn() })).toHaveLength(7);
  });

  it("shows header and row cells that match the column count", () => {
    renderTable(true, [base]);
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
    expect(screen.getAllByRole("cell")).toHaveLength(7);
    expect(screen.getByText("Kari Nordmann")).toBeTruthy();
    expect(screen.getByText("Leilighet A")).toBeTruthy();
  });

  it("hides the Edit button without manage rights and calls onEdit with the row when allowed", async () => {
    const user = userEvent.setup();
    const first = renderTable(false, [base]);
    expect(screen.queryByRole("button", { name: "common.actions.edit" })).toBeNull();
    expect(first.columns).toHaveLength(6);
    cleanup();

    const { onEdit } = renderTable(true, [base]);
    await user.click(screen.getByRole("button", { name: "common.actions.edit" }));
    expect(onEdit).toHaveBeenCalledWith(base);
  });

  it("shows a placeholder name and a question mark for an unreadable customer", () => {
    renderTable(false, [{ ...base, customerName: UNKNOWN_CUSTOMER }]);
    expect(screen.getByText("overnatting.unknownCustomer")).toBeTruthy();
    expect(screen.getByText("?")).toBeTruthy();
  });
});
