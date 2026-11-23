import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InvoiceHistoryCard } from "@/features/billing/components/invoice-history-card";
import type { InvoiceRow } from "@/features/billing/lib/invoice-history";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

const listInvoices = vi.fn();

vi.mock("@/lib/billing/actions/list-invoices", () => ({ listInvoices: (id: string) => listInvoices(id) }));
vi.mock("@/i18n/client", () => ({
  useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb", formatDate: () => "23. nov. 2026" }),
}));

const row = (over: Partial<InvoiceRow> = {}): InvoiceRow => ({
  id: "in_1",
  number: "ABCD-0001",
  createdIso: "2026-11-23T10:00:00.000Z",
  amount: 750,
  currency: "NOK",
  status: "paid",
  viewUrl: "https://invoice.stripe.com/i/abc",
  pdfUrl: "https://pay.stripe.com/invoice/abc/pdf",
  ...over,
});

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("InvoiceHistoryCard", () => {
  it("asks for the invoices of the given organization and lists them", async () => {
    listInvoices.mockResolvedValue({ ok: true, invoices: [row(), row({ id: "in_2", number: "ABCD-0002", status: "open", pdfUrl: null })] });
    render(<InvoiceHistoryCard organizationId="org-1" />);
    expect(screen.getByText("Henter fakturaer…")).toBeTruthy();
    await screen.findByText("ABCD-0001");
    expect(listInvoices).toHaveBeenCalledWith("org-1");
    expect(screen.getByText("Betalt")).toBeTruthy();
    expect(screen.getByText("Venter på betaling")).toBeTruthy();
    expect(screen.getAllByText(/750/).length).toBe(2);
  });

  it("links to view and download in a new tab, and omits a missing PDF link", async () => {
    listInvoices.mockResolvedValue({ ok: true, invoices: [row(), row({ id: "in_2", number: "ABCD-0002", pdfUrl: null })] });
    render(<InvoiceHistoryCard organizationId="org-1" />);
    const view = await screen.findByRole("link", { name: "Vis faktura ABCD-0001" });
    expect(view.getAttribute("href")).toBe("https://invoice.stripe.com/i/abc");
    expect(view.getAttribute("target")).toBe("_blank");
    expect(view.getAttribute("rel")).toContain("noopener");
    expect(screen.getByRole("link", { name: "Last ned faktura ABCD-0001 som PDF" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Last ned faktura ABCD-0002 som PDF" })).toBeNull();
  });

  it("shows an empty state before the first invoice", async () => {
    listInvoices.mockResolvedValue({ ok: true, invoices: [] });
    render(<InvoiceHistoryCard organizationId="org-1" />);
    expect(await screen.findByText("Ingen fakturaer ennå")).toBeTruthy();
  });

  it("shows the error and retries", async () => {
    listInvoices.mockResolvedValueOnce({ ok: false, error: "Kunne ikke hente" }).mockResolvedValueOnce({ ok: true, invoices: [row()] });
    render(<InvoiceHistoryCard organizationId="org-1" />);
    expect((await screen.findByRole("alert")).textContent).toContain("Kunne ikke hente");
    fireEvent.click(screen.getByRole("button", { name: "Prøv igjen" }));
    await waitFor(() => expect(screen.getByText("ABCD-0001")).toBeTruthy());
    expect(listInvoices).toHaveBeenCalledTimes(2);
  });

  it("treats a thrown error like a failure", async () => {
    listInvoices.mockRejectedValue(new Error("network"));
    render(<InvoiceHistoryCard organizationId="org-1" />);
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
