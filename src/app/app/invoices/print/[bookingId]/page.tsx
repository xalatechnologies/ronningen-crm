import { InvoicePrintToolbar } from "@/components/invoices/print-toolbar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ bookingId: string }> };

/** Rediger her eller flytt til innstillinger / miljøvariabel senere. */
const ISSUER = {
  name: "Rønningen",
  subtitle: "Oppdatér virksomhetsinfo under Innstillinger når felt er klare.",
  orgNo: "",
  addressLines: [] as string[],
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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { bookingId } = await params;
  return {
    title: `Faktura · ${bookingId.slice(0, 8)}`,
  };
}

export default async function InvoicePrintPage({ params }: PageProps) {
  const { bookingId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: row, error } = await supabase
    .from("bookings")
    .select(
      "id, event_type, event_date, guest_count, total_price, paid_amount, remaining_amount, status, booking_reference, payment_due_date, notes, customers(name, phone, email, address), properties(name)",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !row) notFound();

  const r = row as {
    id: string;
    event_type: string;
    event_date: string;
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

  const today = new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const customerName = r.customers?.name?.trim() || "Ukjent mottaker";
  const invoiceNo = r.booking_reference?.trim() || r.id.slice(0, 8).toUpperCase();
  const eventType = r.event_type?.trim() || "Arrangement";
  const dueIso = (r.payment_due_date ?? r.event_date).slice(0, 10);
  const propertyLine = r.properties?.name
    ? `Lokale: ${r.properties.name}`
    : null;

  const description = [
    `${eventType}, ${formatLongDate(r.event_date)}`,
    r.guest_count ? `${r.guest_count} gjester` : null,
    propertyLine,
    Number(r.paid_amount) > 0
      ? `Tidligere innbetalt: ${formatNok(Number(r.paid_amount))} (ref. booking)`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="min-h-screen bg-white px-8 py-10 text-slate-900 print:p-12 print:px-16">
        <div className="mx-auto max-w-3xl text-[13px] leading-relaxed print:max-w-none">
          <header className="flex flex-col justify-between gap-6 border-b-2 border-slate-800 pb-6 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {ISSUER.name}
              </h1>
              <p className="mt-1 text-slate-600">{ISSUER.subtitle}</p>
              {ISSUER.orgNo ? (
                <p className="mt-1 text-slate-600">Org.nr {ISSUER.orgNo}</p>
              ) : null}
              {ISSUER.addressLines.map((line) => (
                <p key={line} className="text-slate-600">
                  {line}
                </p>
              ))}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">
                Faktura
              </p>
              <p className="mt-2 text-lg font-bold tabular-nums">Nr. {invoiceNo}</p>
              <p className="mt-1 text-slate-600">Fakturadato {today}</p>
              <p className="mt-1 font-medium text-slate-800">
                Forfall {formatLongDate(dueIso)}
                {r.payment_due_date ? "" : " (arrangementsdato)"}
              </p>
            </div>
          </header>

          <section className="mt-8">
            <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Mottaker
            </h2>
            <p className="mt-2 text-base font-semibold text-slate-900">{customerName}</p>
            {r.customers?.address ? (
              <p className="mt-1 whitespace-pre-line text-slate-700">
                {r.customers.address}
              </p>
            ) : null}
            {r.customers?.email ? (
              <p className="mt-1 text-slate-700">{r.customers.email}</p>
            ) : null}
            {r.customers?.phone ? (
              <p className="mt-1 text-slate-700">Tlf. {r.customers.phone}</p>
            ) : null}
          </section>

          <section className="mt-10">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-slate-800 text-xs font-bold tracking-wider text-slate-600 uppercase">
                  <th className="py-2 pr-4">Beskrivelse</th>
                  <th className="w-24 py-2 text-right">Ant.</th>
                  <th className="w-36 py-2 text-right">Beløp</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200 align-top">
                  <td className="py-4 pr-4 text-slate-800">
                    <span className="font-medium">Restbeløp booking</span>
                    <span className="mt-1 block text-slate-600">{description}</span>
                  </td>
                  <td className="py-4 text-right tabular-nums text-slate-800">1</td>
                  <td className="py-4 text-right text-base font-semibold tabular-nums text-slate-900">
                    {formatNok(remaining)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="mt-6 flex justify-end border-t-2 border-slate-800 pt-4">
              <div className="text-right">
                <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                  Sum å betale
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                  {formatNok(remaining)}
                </p>
                <p className="mt-2 max-w-xs text-xs text-slate-600">
                  Beløp i norske kroner. MVA og avtalt forfallsdato følger kontrakt
                  eller tilleggsavtale — avstem mot regnskap.
                </p>
              </div>
            </div>
          </section>

          {r.notes?.trim() ? (
            <section className="mt-10 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                Merknad
              </h2>
              <p className="mt-2 whitespace-pre-line text-slate-800">{r.notes.trim()}</p>
            </section>
          ) : null}

          <footer className="mt-14 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
            Generert fra intern booking. Ved betaling: oppgi fakturanummer og
            kundenavn. Behandling av personopplysninger følger virksomhetens
            retningslinjer.
          </footer>
        </div>
      </div>
      <InvoicePrintToolbar />
    </>
  );
}
