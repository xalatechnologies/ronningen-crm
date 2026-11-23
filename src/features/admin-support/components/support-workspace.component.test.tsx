import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupportWorkspace } from "@/features/admin-support/components/support-workspace";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import type { AdminSupportNote, AdminSupportOverview, AdminSupportTicket } from "@/lib/admin/queries/support";

const addNote = vi.fn();
const setStatus = vi.fn();
const createTicket = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
let params = new URLSearchParams();

vi.mock("@/lib/admin/actions/support", () => ({
  addSupportNote: (i: unknown) => addNote(i),
  updateSupportTicketStatus: (i: unknown) => setStatus(i),
  createSupportTicket: (i: unknown) => createTicket(i),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }), useSearchParams: () => params }));
vi.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }));
vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }) }));

const NOW = "2026-11-23T12:00:00Z";

const note = (id: string, over: Partial<AdminSupportNote> = {}): AdminSupportNote => ({
  id,
  body: `Melding ${id}`,
  authorName: "Eva",
  authorIsPlatformAdmin: false,
  isInternal: false,
  createdAt: "2026-11-23T10:00:00Z",
  ...over,
});

const ticket = (id: string, over: Partial<AdminSupportTicket> = {}): AdminSupportTicket => ({
  id,
  organizationId: `org-${id}`,
  organizationName: `Org ${id}`,
  organizationSlug: `slug-${id}`,
  status: "open",
  category: "billing",
  subject: `Sak ${id}`,
  noteCount: 1,
  notes: [note(`${id}-1`)],
  assignedToName: null,
  createdByName: "Eva",
  ticketSource: "tenant",
  createdAt: "2026-11-20T10:00:00Z",
  updatedAt: "2026-11-23T10:00:00Z",
  ...over,
});

const data = (tickets: AdminSupportTicket[]): AdminSupportOverview => ({
  tickets,
  orgOptions: [{ id: "org-9", name: "Org Ni" }],
  openQueue: [],
  statusCounts: { all: tickets.length, open: 0, waiting: 0, resolved: 0 },
});

beforeEach(() => {
  vi.clearAllMocks();
  params = new URLSearchParams();
});
afterEach(cleanup);

describe("SupportWorkspace", () => {
  const tickets = [
    ticket("res", { status: "resolved", updatedAt: "2026-11-23T11:00:00Z" }),
    ticket("wait", { status: "waiting", updatedAt: "2026-11-22T10:00:00Z" }),
    ticket("open", { updatedAt: "2026-11-21T10:00:00Z" }),
  ];

  it("lists open tickets first and shows the first one with its messages and organization link", () => {
    render(<SupportWorkspace data={data(tickets)} nowIso={NOW} />);
    const rows = screen.getAllByRole("button", { name: /Org (res|wait|open)/ });
    expect(rows.map((r) => /Org (open|wait|res)/.exec(r.textContent ?? "")?.[1])).toEqual(["open", "wait", "res"]);
    expect(screen.getByRole("heading", { name: "Sak open" })).toBeTruthy();
    expect(screen.getAllByText("Melding open-1")).toHaveLength(2); // list preview and the conversation
    expect(screen.getByRole("link", { name: "Org open" }).getAttribute("href")).toContain("org-open");
  });

  it("filters by status from the address and shows counts", () => {
    params = new URLSearchParams("filter=waiting");
    render(<SupportWorkspace data={data(tickets)} nowIso={NOW} />);
    expect(screen.queryByRole("button", { name: /Org open/ })).toBeNull();
    expect(screen.getByRole("heading", { name: "Sak wait" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Alle 3/ })).toBeTruthy();
  });

  it("searches the text of messages and keeps the search in the address", () => {
    params = new URLSearchParams("q=melding wait-1");
    render(<SupportWorkspace data={data(tickets)} nowIso={NOW} />);
    expect(screen.getAllByRole("button", { name: /Org / })).toHaveLength(1);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "faktura" } });
    expect(replace).toHaveBeenCalledWith("/admin/support?q=faktura", { scroll: false });
  });

  it("puts the selected ticket in the address when one is clicked", () => {
    render(<SupportWorkspace data={data(tickets)} nowIso={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: /Org wait/ }));
    expect(replace).toHaveBeenCalledWith("/admin/support?sak=wait", { scroll: false });
  });

  it("opens the ticket named in the address", () => {
    params = new URLSearchParams("sak=res");
    render(<SupportWorkspace data={data(tickets)} nowIso={NOW} />);
    expect(screen.getByRole("heading", { name: "Sak res" })).toBeTruthy();
  });

  it("marks internal notes and shows platform replies apart from customer messages", () => {
    const t1 = ticket("a", { notes: [note("c"), note("p", { authorIsPlatformAdmin: true, authorName: "Per" }), note("i", { isInternal: true, body: "Hemmelig" })] });
    render(<SupportWorkspace data={data([t1])} nowIso={NOW} />);
    expect(screen.getByText(/Internt notat · Eva/)).toBeTruthy();
    expect(screen.getByText("Hemmelig")).toBeTruthy();
    expect(screen.getByText(/Per ·/)).toBeTruthy();
  });

  it("sends a reply to the customer, and an internal note when that tab is chosen", async () => {
    addNote.mockResolvedValue({ ok: true });
    render(<SupportWorkspace data={data([ticket("a")])} nowIso={NOW} />);
    const send = screen.getByRole("button", { name: "Send svar" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Svar til kunde", { selector: "textarea" }), { target: { value: "Vi ser på det" } });
    fireEvent.click(send);
    await waitFor(() => expect(addNote).toHaveBeenCalledWith({ ticketId: "a", body: "Vi ser på det", isInternal: false }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("tab", { name: "Internt notat" }));
    fireEvent.change(screen.getByLabelText("Internt notat", { selector: "textarea" }), { target: { value: "Ring kunden" } });
    fireEvent.click(screen.getByRole("button", { name: "Legg til internt notat" }));
    await waitFor(() => expect(addNote).toHaveBeenLastCalledWith({ ticketId: "a", body: "Ring kunden", isInternal: true }));
  });

  it("keeps the text and shows an error when sending fails", async () => {
    addNote.mockResolvedValue({ ok: false, error: "nope" });
    render(<SupportWorkspace data={data([ticket("a")])} nowIso={NOW} />);
    const box = screen.getByLabelText("Svar til kunde", { selector: "textarea" }) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "Hei der" } });
    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect((screen.getByLabelText("Svar til kunde", { selector: "textarea" }) as HTMLTextAreaElement).value).toBe("Hei der");
  });

  it("shows an empty state when there are no tickets, and when a filter matches none", () => {
    const { unmount } = render(<SupportWorkspace data={data([])} nowIso={NOW} />);
    expect(screen.getByText("Ingen support-saker ennå")).toBeTruthy();
    unmount();
    params = new URLSearchParams("filter=resolved");
    render(<SupportWorkspace data={data([ticket("a")])} nowIso={NOW} />);
    expect(screen.getByText("Ingen saker her")).toBeTruthy();
  });

  it("keeps Create off until an organization is chosen", async () => {
    render(<SupportWorkspace data={data([ticket("a")])} nowIso={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Opprett sak" }));
    const submit = (await screen.findAllByRole("button", { name: "Opprett sak" })).at(-1) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Emne"), { target: { value: "Faktura" } });
    expect(submit.disabled).toBe(true); // an organization is still needed
  });
});
