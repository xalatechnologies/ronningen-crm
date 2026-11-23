import { describe, expect, it } from "vitest";

import { toInvoiceRows, type StripeInvoiceLike } from "@/features/billing/lib/invoice-history";

const inv = (over: Partial<StripeInvoiceLike> = {}): StripeInvoiceLike => ({
  id: "in_1",
  number: "ABCD-0001",
  status: "paid",
  created: 1_790_000_000,
  currency: "nok",
  total: 93750,
  amount_paid: 93750,
  hosted_invoice_url: "https://invoice.stripe.com/i/acct/abc",
  invoice_pdf: "https://pay.stripe.com/invoice/abc/pdf",
  ...over,
});

describe("toInvoiceRows", () => {
  it("converts øre to kroner and the unix time to an ISO date", () => {
    const [row] = toInvoiceRows([inv()]);
    expect(row).toMatchObject({ id: "in_1", number: "ABCD-0001", amount: 937.5, currency: "NOK", status: "paid" });
    expect(row?.createdIso).toBe(new Date(1_790_000_000 * 1000).toISOString());
  });

  it("leaves out drafts and unknown statuses", () => {
    expect(toInvoiceRows([inv({ status: "draft" }), inv({ id: "in_2", status: null }), inv({ id: "in_3", status: "weird" })])).toEqual([]);
  });

  it("keeps open, uncollectible and void invoices", () => {
    const rows = toInvoiceRows([inv({ id: "a", status: "open" }), inv({ id: "b", status: "uncollectible" }), inv({ id: "c", status: "void" })]);
    expect(rows.map((r) => r.status).sort()).toEqual(["open", "uncollectible", "void"]);
  });

  it("sorts newest first", () => {
    const rows = toInvoiceRows([inv({ id: "old", created: 1_700_000_000 }), inv({ id: "new", created: 1_790_000_000 })]);
    expect(rows.map((r) => r.id)).toEqual(["new", "old"]);
  });

  it("drops links that are not https", () => {
    const [row] = toInvoiceRows([inv({ hosted_invoice_url: "javascript:alert(1)", invoice_pdf: "http://x.test/a.pdf" })]);
    expect(row).toMatchObject({ viewUrl: null, pdfUrl: null });
  });

  it("allows a missing number and missing links", () => {
    const [row] = toInvoiceRows([inv({ number: null, hosted_invoice_url: null, invoice_pdf: undefined })]);
    expect(row).toMatchObject({ number: null, viewUrl: null, pdfUrl: null });
  });
});
