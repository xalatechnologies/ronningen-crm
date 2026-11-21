import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

type Row = { id: string; name: string; amount: number };

const rows: Row[] = [
  { id: "a", name: "Alpha", amount: 10 },
  { id: "b", name: "Beta", amount: 20 },
];

function columns(onEdit: (r: Row) => void): DataTableColumn<Row>[] {
  return [
    { id: "name", header: "Name", cell: (r) => r.name },
    { id: "amount", header: "Amount", align: "right", cell: (r) => `${r.amount} kr` },
    {
      id: "actions",
      header: "Actions",
      srOnlyHeader: true,
      stopRowClick: true,
      cell: (r) => (
        <button type="button" onClick={() => onEdit(r)}>
          Edit {r.name}
        </button>
      ),
    },
  ];
}

describe("DataTable", () => {
  afterEach(cleanup);

  it("renders headers and one row per item", () => {
    render(<DataTable rows={rows} getRowKey={(r) => r.id} columns={columns(vi.fn())} />);
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Amount" })).toBeTruthy();
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("20 kr")).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("calls onRowClick on click and does not fire it from stopRowClick cells", async () => {
    const onRow = vi.fn();
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(
      <DataTable rows={rows} getRowKey={(r) => r.id} columns={columns(onEdit)} onRowClick={onRow} />,
    );

    await user.click(screen.getByText("Alpha"));
    expect(onRow).toHaveBeenCalledWith(rows[0]);

    await user.click(screen.getByText("Edit Beta"));
    expect(onEdit).toHaveBeenCalledWith(rows[1]);
    expect(onRow).toHaveBeenCalledTimes(1);
  });

  it("makes a row a tab stop with Enter support only when it holds no buttons of its own", async () => {
    const onRow = vi.fn();
    const user = userEvent.setup();
    const plain: DataTableColumn<Row>[] = [{ id: "name", header: "Name", cell: (r) => r.name }];
    render(
      <DataTable
        rows={rows}
        getRowKey={(r) => r.id}
        columns={plain}
        onRowClick={onRow}
        rowActionLabel={(r) => `Open ${r.name}`}
      />,
    );
    const betaRow = screen.getByRole("row", { name: "Open Beta" });
    expect(betaRow.getAttribute("tabindex")).toBe("0");
    betaRow.focus();
    await user.keyboard("{Enter}");
    expect(onRow).toHaveBeenCalledWith(rows[1]);

    cleanup();
    render(
      <DataTable rows={rows} getRowKey={(r) => r.id} columns={columns(vi.fn())} onRowClick={onRow} />,
    );
    expect(screen.getByText("Alpha").closest("tr")?.getAttribute("tabindex")).toBeNull();
  });

  it("does not make rows focusable without onRowClick", () => {
    render(<DataTable rows={rows} getRowKey={(r) => r.id} columns={columns(vi.fn())} />);
    expect(screen.getByText("Alpha").closest("tr")?.getAttribute("tabindex")).toBeNull();
  });

  it("draws a phone list when renderMobileItem is given", () => {
    render(
      <DataTable
        rows={rows}
        getRowKey={(r) => r.id}
        columns={columns(vi.fn())}
        renderMobileItem={(r) => <span>mobile {r.name}</span>}
      />,
    );
    expect(screen.getByText("mobile Alpha")).toBeTruthy();
    expect(screen.getByText("mobile Beta")).toBeTruthy();
  });
});
