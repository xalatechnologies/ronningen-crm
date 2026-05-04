import { InvoicePrintToolbar } from "@/components/invoices/print-toolbar";
import { formatBookingListDateLabel } from "@/lib/booking-period";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ bookingId: string }> };

/** Rediger her eller flytt til innstillinger / miljøvariabel senere. */
const ISSUER = {
  name: "Rønningen",
  tagline: "Selskapslokale og arrangement",
  subtitle:
    "Oppdatér virksomhetsadresse, org.nr. og betalingsinformasjon under Innstillinger når feltene er klare.",
  orgNo: "" as string,
  addressLines: [] as string[],
  contactEmail: "" as string,
  contactPhone: "" as string,
  bankInfo:
    "Kontonummer og KID sendes på e-post fra administrator, eller avtales direkte ved fakturering.",
} as const;

function isCancelledStatus(status: string) {
  const x = status.toLowerCase();
  return x === "cancelled" || x === "avbestilt";
}

function formatNok(n: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatLongDate(iso: string) {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

function filenameSafeTitle(invoiceNo: string) {
  const cleaned = invoiceNo.replace(/[/\\:*?"<>|]+/g, "-").trim();
  return `Faktura-nr-${cleaned}`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { bookingId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("bookings")
    .select("booking_reference, status, remaining_amount")
    .eq("id", bookingId)
    .maybeSingle();

  if (
    !data ||
    isCancelledStatus(data.status) ||
    Number(data.remaining_amount) <= 0
  ) {
    return { title: "Faktura" };
  }

  const no =
    data.booking_reference?.trim() || bookingId.slice(0, 8).toUpperCase();
  return { title: `Faktura nr. ${no}` };
}

export default async function InvoicePrintPage({ params }: PageProps) {
  const { bookingId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: row, error } = await supabase
    .from("bookings")
    .select(
      "id, event_type, event_date, event_end_date, event_start_time, event_end_time, guest_count, total_price, paid_amount, remaining_amount, status, booking_reference, payment_due_date, notes, customers(name, phone, email, address), properties(name)",
    )
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
  const invoiceDateLabel = formatLongDate(todayIso);

  const customerName = r.customers?.name?.trim() || "Ukjent mottaker";
  const invoiceNo = r.booking_reference?.trim() || r.id.slice(0, 8).toUpperCase();
  const documentTitle = filenameSafeTitle(invoiceNo);
  const eventType = r.event_type?.trim() || "Arrangement";
  const dueIso = (r.payment_due_date ?? r.event_date).slice(0, 10);
  const dueNote = r.payment_due_date
    ? "Forfallsdato etter avtalt faktura"
    : "Forfallsdato sammenfallende med arrangementsdato (ingen egen forfallsdato registrert)";

  const totalBooking = Number(r.total_price);
  const paid = Number(r.paid_amount);
  const unitPrice = remaining;

  const lineTitle = "Restbeløp på booking";
  const lineDetailParts = [
    `${eventType} · ${formatBookingListDateLabel({
      eventDateIso: r.event_date,
      eventEndDateIso: r.event_end_date,
      eventStartTime: r.event_start_time,
      eventEndTime: r.event_end_time,
    })}`,
    r.guest_count ? `${r.guest_count} gjester` : null,
    r.properties?.name ? `Lokale: ${r.properties.name}` : null,
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
          {/* Topp: avsender + fakturahode */}
          <header className="invoice-print-avoid-break border-b-2 border-zinc-900 pb-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 lg:max-w-[55%]">
                <p className="font-heading text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
                  {ISSUER.name}
                </p>
                <p className="mt-1 text-sm font-medium text-emerald-800">{ISSUER.tagline}</p>
                <p className="mt-3 text-sm text-zinc-600">{ISSUER.subtitle}</p>
                {ISSUER.orgNo ? (
                  <p className="mt-2 text-sm text-zinc-700">Org.nr {ISSUER.orgNo}</p>
                ) : null}
                {ISSUER.addressLines.map((line) => (
                  <p key={line} className="text-sm text-zinc-700">
                    {line}
                  </p>
                ))}
                {ISSUER.contactEmail || ISSUER.contactPhone ? (
                  <div className="mt-3 space-y-0.5 text-sm text-zinc-700">
                    {ISSUER.contactEmail ? (
                      <p>E-post: {ISSUER.contactEmail}</p>
                    ) : null}
                    {ISSUER.contactPhone ? <p>Tlf. {ISSUER.contactPhone}</p> : null}
                  </div>
                ) : null}
              </div>

              <div className="w-full min-w-0 rounded-md border-2 border-zinc-900 bg-zinc-50/80 p-5 sm:w-auto sm:min-w-68 sm:p-6 lg:shrink-0 print:border-zinc-900 print:bg-white">
                <p className="text-center font-heading text-xs font-bold tracking-[0.25em] text-zinc-500 uppercase">
                  Faktura
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-6 border-b border-zinc-200 pb-2">
                    <dt className="text-zinc-600">Fakturanummer</dt>
                    <dd className="text-right font-semibold tabular-nums text-zinc-950">
                      {invoiceNo}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-6 border-b border-zinc-200 pb-2">
                    <dt className="text-zinc-600">Fakturadato</dt>
                    <dd className="text-right font-medium tabular-nums text-zinc-900">
                      {invoiceDateLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-6 border-b border-zinc-200 pb-2">
                    <dt className="text-zinc-600">Forfallsdato</dt>
                    <dd className="text-right font-semibold tabular-nums text-zinc-950">
                      {formatLongDate(dueIso)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-6">
                    <dt className="text-zinc-600">Booking-ID</dt>
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

          {/* Mottaker */}
          <section className="invoice-print-avoid-break mt-10">
            <h2 className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
              Faktureres til
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
                {r.customers?.phone ? <p>Tlf. {r.customers.phone}</p> : null}
              </div>
            </div>
          </section>

          {/* Linjer */}
          <section className="invoice-print-avoid-break mt-10">
            <h2 className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
              Spesifikasjon
            </h2>
            <div className="mt-3 overflow-x-auto rounded-md border border-zinc-200">
              <table className="w-full min-w-lg border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-bold tracking-wide text-zinc-600 uppercase">
                    <th className="px-4 py-3 sm:px-5">Tekst</th>
                    <th className="w-20 px-3 py-3 text-right whitespace-nowrap sm:w-24">
                      Antall
                    </th>
                    <th className="w-32 px-3 py-3 text-right whitespace-nowrap sm:w-36">
                      Enhetspris
                    </th>
                    <th className="w-36 px-4 py-3 text-right whitespace-nowrap sm:px-5">
                      Beløp
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
                          Tidligere innbetalt på booking:{" "}
                          <span className="font-semibold tabular-nums text-zinc-800">
                            {formatNok(paid)}
                          </span>{" "}
                          (total avtalt {formatNok(totalBooking)}).
                        </p>
                      ) : null}
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-4 text-right tabular-nums text-zinc-900">
                      1
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-4 text-right tabular-nums text-zinc-900">
                      {formatNok(unitPrice)}
                    </td>
                    <td className="border-b border-zinc-100 px-4 py-4 text-right text-base font-bold tabular-nums text-zinc-950 sm:px-5">
                      {formatNok(remaining)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-col items-stretch gap-4 sm:flex-row sm:justify-end">
              <div className="w-full rounded-md border-2 border-zinc-900 bg-zinc-50 p-5 text-right sm:max-w-sm sm:p-6 print:bg-white">
                <p className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
                  Å betale
                </p>
                <p className="mt-2 font-heading text-3xl font-bold tabular-nums text-zinc-950">
                  {formatNok(remaining)}
                </p>
                <p className="mt-2 text-xs leading-snug text-zinc-600">
                  Beløpet er oppgitt i norske kroner (NOK), inkl. MVA i henhold til
                  gjeldende satser der dette kommer til anvendelse. Avstem mot avtale og
                  regnskap.
                </p>
              </div>
            </div>
          </section>

          {/* Betaling */}
          <section className="invoice-print-avoid-break mt-10 rounded-md border border-dashed border-zinc-300 bg-zinc-50/50 p-5 sm:p-6 print:bg-white">
            <h2 className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
              Betalingsinformasjon
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-800">{ISSUER.bankInfo}</p>
            <p className="mt-3 text-sm text-zinc-700">
              Oppgi alltid <strong className="font-semibold">fakturanummer</strong> (
              {invoiceNo}) og <strong className="font-semibold">kundenavn</strong> ved
              innbetaling.
            </p>
          </section>

          {r.notes?.trim() ? (
            <section className="invoice-print-avoid-break mt-8 rounded-md border border-zinc-200 bg-amber-50/40 p-5 sm:p-6 print:bg-white">
              <h2 className="text-xs font-bold tracking-[0.14em] text-zinc-600 uppercase">
                Merknad
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm text-zinc-900">
                {r.notes.trim()}
              </p>
            </section>
          ) : null}

          <footer className="mt-12 border-t border-zinc-200 pt-6 text-center text-[11px] leading-relaxed text-zinc-500">
            Dokumentet er generert fra Rønningen-booking. Ved spørsmål om innhold eller
            betaling, kontakt virksomheten. Behandling av personopplysninger følger
            virksomhetens retningslinjer og gjeldende personvernlovgivning.
          </footer>
        </article>
      </div>
      <InvoicePrintToolbar documentTitle={documentTitle} />
    </>
  );
}
