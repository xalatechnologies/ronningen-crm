import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PortalInboxView } from "@/features/portal-inbox/components/portal-inbox-view";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import type { InboxRow } from "@/lib/portal/inbox-rules";

const push = vi.fn();
let searchQuery = "";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/providers/page-search-provider", () => ({ usePageSearch: () => ({ query: searchQuery }) }));
vi.mock("@/i18n/client", () => ({
  useTranslation: () => ({
    t: createTranslator(getDictionary("nb")),
    locale: "nb",
    formatDate: (d: string) => d.slice(0, 10),
    formatCurrency: (n: number) => `${n} kr`,
  }),
}));

const row = (over: Partial<InboxRow>): InboxRow => ({
  bookingId: "b1",
  customerName: "Kari Nordmann",
  reference: "RN-1",
  eventDate: "2026-12-10",
  eventType: "Bryllup",
  state: "active",
  unread: 0,
  wishesWaiting: 0,
  planWaiting: false,
  attention: 0,
  tab: "messages",
  ...over,
});

const rows = [
  row({ bookingId: "a", customerName: "Kari Nordmann", unread: 2, wishesWaiting: 1, attention: 3, tab: "messages" }),
  row({ bookingId: "b", customerName: "Per Hansen", reference: "RN-2", state: "invited", eventDate: "2027-02-01", tab: "schedule" }),
  row({ bookingId: "c", customerName: "Anne Olsen", reference: "RN-3", state: "expired", eventDate: null, tab: "schedule" }),
];

beforeEach(() => {
  searchQuery = "";
  push.mockClear();
  window.history.replaceState(null, "", "/app/portal");
});
afterEach(cleanup);

describe("PortalInboxView", () => {
  it("shows summary cards and, on the 'needs you' filter, only customers waiting for a reply", () => {
    render(<PortalInboxView rows={rows} initialFilter="attention" today="2026-11-23" />);
    const cards = screen.getByRole("region", { name: "Kundeportal" });
    expect(within(cards).getByText("Venter på deg")).toBeTruthy();
    expect(within(cards).getByText("3 meldinger, ønsker og planer")).toBeTruthy();
    expect(within(cards).getByText(/Kari Nordmann · om 17 dager/)).toBeTruthy();
    const table = screen.getAllByRole("table")[0]!;
    expect(within(table).getByText("Kari Nordmann")).toBeTruthy();
    expect(within(table).queryByText("Per Hansen")).toBeNull();
    expect(within(table).getByText("2 uleste")).toBeTruthy();
  });

  it("switches filter, keeps the address in sync and shows the portal state", () => {
    render(<PortalInboxView rows={rows} initialFilter="attention" today="2026-11-23" />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Invitert/ }));
    });
    expect(window.location.search).toBe("?filter=invited");
    const table = screen.getAllByRole("table")[0]!;
    expect(within(table).getByText("Per Hansen")).toBeTruthy();
    expect(within(table).getByText("Invitasjon utløpt")).toBeTruthy();
    expect(within(table).getByText("Dato ikke satt")).toBeTruthy();
  });

  it("filters by the header search and says so when nothing matches", () => {
    searchQuery = "per";
    const { rerender } = render(<PortalInboxView rows={rows} initialFilter="all" today="2026-11-23" />);
    const table = screen.getAllByRole("table")[0]!;
    expect(within(table).getByText("Per Hansen")).toBeTruthy();
    expect(within(table).queryByText("Kari Nordmann")).toBeNull();
    expect(screen.getByText("Viser 1 kunde")).toBeTruthy();
    searchQuery = "zzz";
    rerender(<PortalInboxView rows={rows} initialFilter="all" today="2026-11-23" />);
    expect(screen.getByText("Ingen treff på søket ditt.")).toBeTruthy();
  });

  it("opens the customer's portal on the tab that needs attention", () => {
    render(<PortalInboxView rows={rows} initialFilter="all" today="2026-11-23" />);
    const table = screen.getAllByRole("table")[0]!;
    fireEvent.click(within(table).getByText("Kari Nordmann"));
    expect(push).toHaveBeenCalledWith("/app/bookings/a/portal");
    fireEvent.click(within(table).getByText("Per Hansen"));
    expect(push).toHaveBeenCalledWith("/app/bookings/b/portal?tab=schedule");
  });

  it("shows the all-clear message when nothing needs a reply, and the empty message with no customers", () => {
    const quiet = rows.map((r) => ({ ...r, unread: 0, wishesWaiting: 0, attention: 0 }));
    const { rerender } = render(<PortalInboxView rows={quiet} initialFilter="attention" today="2026-11-23" />);
    expect(screen.getByText("Du er à jour")).toBeTruthy();
    rerender(<PortalInboxView rows={[]} initialFilter="attention" today="2026-11-23" />);
    expect(screen.getByText(/Ingen kunder har fått tilgang ennå/)).toBeTruthy();
  });
});
