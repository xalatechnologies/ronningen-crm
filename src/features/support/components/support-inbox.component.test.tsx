import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupportInbox } from "@/features/support/components/support-inbox";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import type { OrgSupportOverview, OrgSupportTicket } from "@/lib/support/types";

const createTicket = vi.fn();
const reply = vi.fn();
const refresh = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("@/lib/support/actions", () => ({
  createOrgSupportTicket: (i: unknown) => createTicket(i),
  replyToOrgSupportTicket: (i: unknown) => reply(i),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }));
vi.mock("@/i18n/client", () => ({ useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }) }));

const NOW = "2026-11-23T12:00:00Z";

const ticket = (id: string, status: OrgSupportTicket["status"], over: Partial<OrgSupportTicket> = {}): OrgSupportTicket => ({
  id,
  subject: `Sak ${id}`,
  category: "billing",
  status,
  createdAt: "2026-11-20T10:00:00Z",
  updatedAt: "2026-11-23T11:00:00Z",
  messages: [
    { id: `${id}-1`, body: `Første melding ${id}`, authorName: "Eva", createdAt: "2026-11-20T10:00:00Z", isFromPlatform: false },
    { id: `${id}-2`, body: `Svar fra oss ${id}`, authorName: null, createdAt: "2026-11-23T11:00:00Z", isFromPlatform: true },
  ],
  ...over,
});

const data = (tickets: OrgSupportTicket[]): OrgSupportOverview => ({ tickets, openCount: tickets.filter((t) => t.status === "open").length });

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("SupportInbox", () => {
  const tickets = [ticket("a", "resolved", { updatedAt: "2026-11-01T10:00:00Z" }), ticket("b", "open"), ticket("c", "waiting")];

  it("lists tickets with the one waiting for you first, and shows its conversation", () => {
    render(<SupportInbox data={data(tickets)} nowIso={NOW} />);
    const rows = screen.getAllByRole("button", { name: /Sak [abc]/ });
    expect(rows.map((r) => /Sak ([abc])/.exec(r.textContent ?? "")?.[1])).toEqual(["c", "b", "a"]);
    expect(screen.getByRole("heading", { name: "Sak c" })).toBeTruthy();
    expect(screen.getByText("Første melding c")).toBeTruthy();
    expect(screen.getByText("I dag")).toBeTruthy();
  });

  it("shows relative times and who wrote the last message in the list", () => {
    render(<SupportInbox data={data([ticket("b", "open")])} nowIso={NOW} />);
    expect(screen.getAllByText("for 1 time siden").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Svar fra oss b/)).toHaveLength(2); // list preview and the conversation
  });

  it("filters by status with counts and opens another ticket on click", () => {
    render(<SupportInbox data={data(tickets)} nowIso={NOW} />);
    expect(screen.getByRole("button", { name: /Alle 3/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Løste 1/ }));
    expect(screen.queryByRole("button", { name: /Sak b/ })).toBeNull();
    expect(screen.getByRole("heading", { name: "Sak a" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Alle 3/ }));
    fireEvent.click(screen.getByRole("button", { name: /Sak b/ }));
    expect(screen.getByRole("heading", { name: "Sak b" })).toBeTruthy();
  });

  it("says so when a filter has no tickets", () => {
    render(<SupportInbox data={data([ticket("b", "open")])} nowIso={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: /Løste 0/ }));
    expect(screen.getByText("Ingen saker her")).toBeTruthy();
    expect(screen.getByText("Velg en sak for å se samtalen")).toBeTruthy();
  });

  it("sends a reply only when it is long enough, and clears the box", async () => {
    reply.mockResolvedValue({ ok: true });
    render(<SupportInbox data={data([ticket("b", "open")])} nowIso={NOW} />);
    const send = screen.getByRole("button", { name: "Send melding" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    const box = screen.getByLabelText("Ditt svar") as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "Takk!" } });
    expect(send.disabled).toBe(false);
    fireEvent.click(send);
    await waitFor(() => expect(reply).toHaveBeenCalledWith({ ticketId: "b", body: "Takk!" }));
    await waitFor(() => expect((screen.getByLabelText("Ditt svar") as HTMLTextAreaElement).value).toBe(""));
    expect(refresh).toHaveBeenCalled();
  });

  it("sends with Ctrl+Enter and keeps the text when sending fails", async () => {
    reply.mockResolvedValue({ ok: false, error: "nope" });
    render(<SupportInbox data={data([ticket("b", "open")])} nowIso={NOW} />);
    const box = screen.getByLabelText("Ditt svar") as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "Hei der" } });
    fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect((screen.getByLabelText("Ditt svar") as HTMLTextAreaElement).value).toBe("Hei der");
  });

  it("has no reply box for a resolved ticket", () => {
    render(<SupportInbox data={data([ticket("a", "resolved")])} nowIso={NOW} />);
    expect(screen.queryByLabelText("Ditt svar")).toBeNull();
    expect(screen.getByText("Saken er lukket. Opprett en ny sak om du trenger mer hjelp.")).toBeTruthy();
  });

  it("creates a ticket from the dialog, validating first", async () => {
    createTicket.mockResolvedValue({ ok: true, ticketId: "new" });
    render(<SupportInbox data={data([ticket("b", "open")])} nowIso={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Ny sak" }));
    fireEvent.click(await screen.findByRole("button", { name: "Send sak" }));
    expect(createTicket).not.toHaveBeenCalled();
    expect(await screen.findByText("Emnet må være minst 3 tegn.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Emne"), { target: { value: "Faktura" } });
    fireEvent.change(screen.getByLabelText("Melding"), { target: { value: "Noe er feil" } });
    fireEvent.click(screen.getByRole("button", { name: "Send sak" }));
    await waitFor(() => expect(createTicket).toHaveBeenCalledWith({ subject: "Faktura", body: "Noe er feil", category: "other" }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalled();
  });

  it("shows an empty state with a button to create the first ticket", () => {
    render(<SupportInbox data={data([])} nowIso={NOW} />);
    expect(screen.getByText("Ingen support-saker")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ny sak" })).toBeTruthy();
  });
});
