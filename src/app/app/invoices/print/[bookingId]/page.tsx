import { getServerTranslation } from "@/i18n/server";
import { InvoicePrintToolbar } from "@/components/invoices/print-toolbar";
import { formatBookingListDateLabel } from "@/lib/booking-period";
import {
  mapOrganizationToInvoiceIssuer,
  type OrganizationProfileRow,
} from "@/lib/organizations/organization-profile";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ bookingId: string }> };

function isCancelledStatus(status: string) {
  const x = status.toLowerCase();
  return x === "cancelled" || x === "avbestilt";
}

function formatNok(locale: string, n: number) {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatLongDate(locale: string, iso: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { t } = await getServerTranslation();
  const { bookingId } = await params;
  const supabase = await createServerSupabaseClient();
  const orgId = await requireServerOrganizationId();
  const { data } = await supabase
    .from("bookings")
    .select("booking_reference, status, remaining_amount")
    .eq("organization_id", orgId)
    .eq("id", bookingId)
    .maybeSingle();

  if (
    !data ||
    isCancelledStatus(data.status) ||
    Number(data.remaining_amount) <= 0
  ) {
    return { title: t("invoices.print.metadataTitle") };
  }

  const no =
    data.booking_reference?.trim() || bookingId.slice(0, 8).toUpperCase();
  return { title: t("invoices.print.metadataTitleWithNo", { no }) };
}

export default async function InvoicePrintPage({ params }: PageProps) {
  const { t, locale } = await getServerTranslation();
  const { bookingId } = await params;

  const supabase = await createServerSupabaseClient();
  const orgId = await requireServerOrganizationId();

  const { data: orgRow } = await supabase
    .from("organizations")
    .select(
      "id, name, slug, logo_url, legal_name, tagline, org_number, address_line1, address_line2, postal_code, city, contact_email, contact_phone, bank_account, payment_instructions",
    )
    .eq("id", orgId)
    .maybeSingle();

  const ISSUER = orgRow
    ? mapOrganizationToInvoiceIssuer(orgRow as OrganizationProfileRow)
    : mapOrganizationToInvoiceIssuer({
        id: orgId,
        name: t("invoices.print.defaultBusinessName"),
        slug: "virksomhet",
        logo_url: null,
        legal_name: null,
        tagline: null,
        org_number: null,
        address_line1: null,
        address_line2: null,
        postal_code: null,
        city: null,
        contact_email: null,
        contact_phone: null,
        bank_account: null,
        payment_instructions: null,
      });

  const { data: row, error } = await supabase
    .from("bookings")
    .select(
      "id, event_type, event_date, event_end_date, event_start_time, event_end_time, guest_count, total_price, paid_amount, remaining_amount, status, booking_reference, payment_due_date, notes, customers(name, phone, email, address), properties(name)",
    )
    .eq("organization_id", orgId)
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !row) notFound();

  const r = row as {
    id: string;
    event_type: string;
    event_date: string;
    event_end_date: string | null;
    event_start_time: string | null;
    event_end_time: string | null;
    guest_count: number;
    total_price: number;
    paid_amount: number;
    remaining_amount: number;
    status: string;
    booking_reference: string | null;
    payment_due_date: string | null;
    notes: string | null;
    customers: {
      name: string;
      phone: string | null;
      email: string | null;
      address: string | null;
    } | null;
    properties: { name: string } | null;
  };

  if (isCancelledStatus(r.status)) notFound();

  const remaining = Number(r.remaining_amount);
  if (remaining <= 0) notFound();

  const todayIso = new Date().toISOString().slice(0, 10);
  const invoiceDateLabel = formatLongDate(locale, todayIso);

  const customerName =
    r.customers?.name?.trim() || t("invoices.print.unknownRecipient");
  const invoiceNo = r.booking_reference?.trim() || r.id.slice(0, 8).toUpperCase();
  const documentTitle = t("invoices.print.filenamePrefix", { no: invoiceNo });
  const eventType =
    r.event_type?.trim() || t("invoices.print.defaultEventType");
  const dueIso = (r.payment_due_date ?? r.event_date).slice(0, 10);
  const dueNote = r.payment_due_date
    ? t("invoices.print.dueDateAfterInvoice")
    : t("invoices.print.dueDateOnEventDate");

  const totalBooking = Number(r.total_price);
  const paid = Number(r.paid_amount);
  const unitPrice = remaining;

  const lineTitle = t("invoices.remainingOnBooking");
  const lineDetailParts = [
    `${eventType} · ${formatBookingListDateLabel({
      eventDateIso: r.event_date,
      eventEndDateIso: r.event_end_date,
      eventStartTime: r.event_start_time,
      eventEndTime: r.event_end_time,
    })}`,
    r.guest_count
      ? t("invoices.print.guests", { count: r.guest_count })
      : null,
    r.properties?.name
      ? t("invoices.print.venue", { name: r.properties.name })
      : null,
  ].filter(Boolean);

  return (
    <>
      <div
        className={cn(
          "invoice-print-surface min-h-screen bg-zinc-100 px-3 pb-28 pt-6 sm:px-6 sm:pb-32 sm:pt-10",
          "print:bg-white print:pb-0 print:pt-0",
        )}
      >
        <article
          className={cn(
            "invoice-print-document mx-auto max-w-[210mm] bg-white text-[13px] leading-relaxed text-zinc-900 shadow-sm ring-1 ring-zinc-200/90",
            "px-6 py-8 sm:px-10 sm:py-10",
            "print:max-w-none print:shadow-none print:ring-0 print:px-0 print:py-0",
          )}
        >
          <header className="invoice-print-avoid-break border-b-2 border-zinc-900 pb-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 lg:max-w-[55%]">
                <p className="font-heading text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
                  {ISSUER.name}
                </p>
                <p className="mt-1 text-sm font-medium text-emerald-800">{ISSUER.tagline}</p>
                <p className="mt-3 text-sm text-zinc-600">{ISSUER.subtitle}</p>
                {ISSUER.orgNo ? (
                  <p className="mt-2 text-sm text-zinc-700">{t("invoices.orgNumberPrefix", { number: ISSUER.orgNo })}</p>
                ) : null}
                {ISSUER.addressLines.map((line) => (
                  <p key={line} className="text-sm text-zinc-700">
                    {line}
                  </p>
                ))}
                {ISSUER.contactEmail || ISSUER.contactPhone ? (
                  <div className="mt-3 space-y-0.5 text-sm text-zinc-700">
                    {ISSUER.contactEmail ? (
                      <p>{t("invoices.emailPrefix", { email: ISSUER.contactEmail })}</p>
                    ) : null}
                    {ISSUER.contactPhone ? <p>{t("invoices.phonePrefix", { phone: ISSUER.contactPhone })}</p> : null}
                  </div>
                ) : null}
              </div>

              <div className="w-full min-w-0 rounded-md border-2 border-zinc-900 bg-zinc-50/80 p-5 sm:w-auto sm:min-w-68 sm:p-6 lg:shrink-0 print:border-zinc-900 print:bg-white">
                <p className="text-center font-heading text-xs font-bold tracking-[0.25em] text-zinc-500 uppercase">
                  {t("invoices.title")}
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-6 border-b border-zinc-200 pb-2">
                    <dt className="text-zinc-600">{t("invoices.invoiceNumber")}</dt>
                    <dd className="text-right font-semibold tabular-nums text-zinc-950">
                      {invoiceNo}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-6 border-b border-zinc-200 pb-2">
                    <dt className="text-zinc-600">{t("invoices.printInvoiceDate")}</dt>
                    <dd className="text-right font-medium tabular-nums text-zinc-900">
                      {invoiceDateLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-6 border-b border-zinc-200 pb-2">
                    <dt className="text-zinc-600">{t("invoices.dueDate")}</dt>
                    <dd className="text-right font-semibold tabular-nums text-zinc-950">
                      {formatLongDate(locale, dueIso)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="text-zinc-600">{t("invoices.print.bookingId")}</dt>
                    <dd className="max-w-48 truncate text-right font-mono text-xs text-zinc-800">
                      {r.id}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 border-t border-zinc-200 pt-3 text-xs leading-snug text-zinc-600">
                  {dueNote}
                </p>
              </div>
            </div>
          </header>

          <section className="invoice-print-avoid-break mt-10">
            <h2 className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
              {t("invoices.billTo")}
            </h2>
            <div className="mt-3 rounded-md border border-zinc-200 bg-white p-5 sm:p-6">
              <p className="font-heading text-lg font-semibold text-zinc-950">
                {customerName}
              </p>
              {r.customers?.address ? (
                <p className="mt-2 whitespace-pre-line text-sm text-zinc-800">
                  {r.customers.address}
                </p>
              ) : null}
              <div className="mt-3 space-y-1 text-sm text-zinc-700">
                {r.customers?.email ? <p>{r.customers.email}</p> : null}
                {r.customers?.phone ? (
                  <p>{t("invoices.print.phonePrefix", { phone: r.customers.phone })}</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="invoice-print-avoid-break mt-10">
            <h2 className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
              {t("invoices.print.specification")}
            </h2>
            <div className="mt-3 overflow-x-auto rounded-md border border-zinc-200">
              <table className="w-full min-w-lg border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-bold tracking-wide text-zinc-600 uppercase">
                    <th className="px-4 py-3 sm:px-5">{t("invoices.print.colText")}</th>
                    <th className="w-20 px-3 py-3 text-right whitespace-nowrap sm:w-24">
                      {t("invoices.print.colQty")}
                    </th>
                    <th className="w-32 px-3 py-3 text-right whitespace-nowrap sm:w-36">
                      {t("invoices.print.colUnitPrice")}
                    </th>
                    <th className="w-36 px-4 py-3 text-right whitespace-nowrap sm:px-5">
                      {t("invoices.print.colAmount")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="align-top">
                    <td className="border-b border-zinc-100 px-4 py-4 sm:px-5">
                      <p className="font-semibold text-zinc-900">{lineTitle}</p>
                      <ul className="mt-2 list-inside list-disc space-y-1 text-zinc-600">
                        {lineDetailParts.map((part) => (
                          <li key={part}>{part}</li>
                        ))}
                      </ul>
                      {paid > 0 ? (
                        <p className="mt-3 text-xs text-zinc-600">
                          {t("invoices.print.previouslyPaid")}{" "}
                          <span className="font-semibold tabular-nums text-zinc-800">
                            {formatNok(locale, paid)}
                          </span>{" "}
                          {t("invoices.print.totalAgreed", {
                            amount: formatNok(locale, totalBooking),
                          })}
                        </p>
                      ) : null}
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-4 text-right tabular-nums text-zinc-900">
                      1
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-4 text-right tabular-nums text-zinc-900">
                      {formatNok(locale, unitPrice)}
                    </td>
                    <td className="border-b border-zinc-100 px-4 py-4 text-right text-base font-bold tabular-nums text-zinc-950 sm:px-5">
                      {formatNok(locale, remaining)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-col items-stretch gap-4 sm:flex-row sm:justify-end">
              <div className="w-full rounded-md border-2 border-zinc-900 bg-zinc-50 p-5 text-right sm:max-w-sm sm:p-6 print:bg-white">
                <p className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
                  {t("invoices.print.amountDue")}
                </p>
                <p className="mt-2 font-heading text-3xl font-bold tabular-nums text-zinc-950">
                  {formatNok(locale, remaining)}
                </p>
                <p className="mt-2 text-xs leading-snug text-zinc-600">
                  {t("invoices.print.amountNote")}
                </p>
              </div>
            </div>
          </section>

          <section className="invoice-print-avoid-break mt-10 rounded-md border border-dashed border-zinc-300 bg-zinc-50/50 p-5 sm:p-6 print:bg-white">
            <h2 className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
              {t("invoices.print.paymentInfo")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-800">{ISSUER.bankInfo}</p>
            <p className="mt-3 text-sm text-zinc-700">
              {t("invoices.print.paymentReference", { invoiceNo })}
            </p>
          </section>

          {r.notes?.trim() ? (
            <section className="invoice-print-avoid-break mt-8 rounded-md border border-zinc-200 bg-amber-50/40 p-5 sm:p-6 print:bg-white">
              <h2 className="text-xs font-bold tracking-[0.14em] text-zinc-600 uppercase">
                {t("invoices.print.note")}
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm text-zinc-900">
                {r.notes.trim()}
              </p>
            </section>
          ) : null}

          <footer className="mt-12 border-t border-zinc-200 pt-6 text-center text-[11px] leading-relaxed text-zinc-500">
            {t("invoices.print.footer")}
          </footer>
        </article>
      </div>
      <InvoicePrintToolbar documentTitle={documentTitle} />
    </>
  );
}
