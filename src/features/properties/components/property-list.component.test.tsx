import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PropertyListRow } from "@/components/properties/types";
import { PropertyList } from "@/features/properties/components/property-list";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }) }));

const rows: PropertyListRow[] = [
  { id: "a", name: "Rønningen gård", address: "Baneveien 290", type: "gård", notes: "Parkering", updatedAtIso: "2026-01-01T00:00:00Z" },
  { id: "b", name: "Annet lokale", address: null, type: null, notes: null, updatedAtIso: "2026-01-01T00:00:00Z" },
];

afterEach(cleanup);

describe("PropertyList", () => {
  it("shows name, type, address and notes, and a fallback for a missing address", () => {
    render(<PropertyList properties={rows} canManage onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Rønningen gård" })).toBeTruthy();
    expect(screen.getByText("Gård")).toBeTruthy();
    expect(screen.getByText("Baneveien 290")).toBeTruthy();
    expect(screen.getByText("Parkering")).toBeTruthy();
    expect(screen.getByText("Ikke angitt")).toBeTruthy();
  });

  it("calls edit and delete with the right row", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<PropertyList properties={rows} canManage onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Rediger Annet lokale" }));
    fireEvent.click(screen.getByRole("button", { name: "Slett Rønningen gård" }));
    expect(onEdit).toHaveBeenCalledWith(rows[1]);
    expect(onDelete).toHaveBeenCalledWith(rows[0]);
  });

  it("hides edit and delete for people who cannot manage", () => {
    render(<PropertyList properties={rows} canManage={false} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
