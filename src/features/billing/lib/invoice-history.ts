/** The part of a Stripe invoice this page reads. Kept small so it can be built by hand in tests. */
export type StripeInvoiceLike = {
  id: string;
  number: string | null;
  status: string | null;
  created: number;
  currency: string;
  total: number;
  amount_paid: number;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
};

export type InvoiceStatus = "paid" | "open" | "uncollectible" | "void";

export type InvoiceRow = {
  id: string;
  /** Invoice number such as "ABCD-0001"; null while Stripe has none. */
  number: string | null;
  createdIso: string;
  /** Total in whole currency units (kroner), not øre. */
  amount: number;
  currency: string;
  status: InvoiceStatus;
  viewUrl: string | null;
  pdfUrl: string | null;
};

const STATUSES: readonly string[] = ["paid", "open", "uncollectible", "void"];

/** Only https links are passed on to the browser. */
function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Turns Stripe invoices into rows for the page, newest first. Drafts (not yet sent to the customer) and
 * unknown statuses are left out. Stripe counts money in the smallest unit (øre), so amounts are divided by 100.
 */
export function toInvoiceRows(invoices: readonly StripeInvoiceLike[]): InvoiceRow[] {
  return invoices
    .filter((inv) => inv.status != null && STATUSES.includes(inv.status))
    .map((inv) => ({
      id: inv.id,
      number: inv.number,
      createdIso: new Date(inv.created * 1000).toISOString(),
      amount: inv.total / 100,
      currency: inv.currency.toUpperCase(),
      status: inv.status as InvoiceStatus,
      viewUrl: safeUrl(inv.hosted_invoice_url),
      pdfUrl: safeUrl(inv.invoice_pdf),
    }))
    .sort((a, b) => b.createdIso.localeCompare(a.createdIso));
}
