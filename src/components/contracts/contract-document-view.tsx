import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { lineItemsTotalNok } from "@/lib/contracts/overrides";
import { ContractPaymentPlan, type EditableInstallment } from "@/components/contracts/contract-payment-plan";
import {
  contractClosingLine,
  contractSignatureUrl,
  contractSignerName,
  contractPartyFacts,
  formatContractDateTime,
  formatContractLineAmount,
  formatContractNok,
  lessorPlaceDate,
  contractExtraLines,
  packageHeadline,
  packageInclusions,
  primaryPackageLine,
  splitContractTermLines,
  summarizeContractExtra,
  emphasizeWifiPassword,
  type ContractFactRow,
} from "@/lib/contracts/layout";
import {
  chosenPackageLabel,
  contractHeadingIssuerName,
  resolvedLegalTerms,
} from "@/lib/contracts/paper-copy";
import type { FrozenContractDocument, FrozenInstallment, FrozenLineItem } from "@/lib/contracts/types";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

function ContractFactList({ rows }: { rows: ContractFactRow[] }) {
  return (
    <dl className="grid grid-cols-[5.75rem_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-xl bg-muted/50 p-4 ring-1 ring-foreground/10">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0 wrap-break-word">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

type EditRow = { label: string; value: string; onChange: (value: string) => void; type?: string };

function ContractEditList({ rows }: { rows: EditRow[] }) {
  return (
    <dl className="grid grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0">
            <Input
              type={row.type}
              className="h-8 rounded-lg border-foreground/25"
              value={row.value}
              onChange={(e) => row.onChange(e.target.value)}
            />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ContractLineEditor(props: {
  lines: FrozenLineItem[];
  onChange: (lines: FrozenLineItem[]) => void;
}) {
  const update = (index: number, values: Partial<FrozenLineItem>) =>
    props.onChange(props.lines.map((line, i) => (i === index ? { ...line, ...values } : line)));
  return (
    <div className="space-y-2">
      {props.lines.map((line, index) => (
        <div key={index} className="grid grid-cols-[minmax(0,1fr)_4.5rem_7rem_2rem] items-center gap-2">
          <Input
            className="h-8"
            value={line.name}
            onChange={(e) => update(index, { name: e.target.value })}
          />
          <Input
            className="h-8"
            type="number"
            min={0}
            aria-label="Antall"
            value={line.quantity}
            onChange={(e) => update(index, { quantity: Number(e.target.value) || 0 })}
          />
          <Input
            className="h-8"
            type="number"
            aria-label="Pris"
            value={line.unitAmountNok}
            onChange={(e) => update(index, { unitAmountNok: Number(e.target.value) || 0 })}
          />
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fjern linje"
            onClick={() => props.onChange(props.lines.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="rounded-lg border border-foreground/30 bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        onClick={() =>
          props.onChange([
            ...props.lines,
            { kind: "custom", name: "", quantity: 1, unitAmountNok: 0, description: null },
          ])
        }
      >
        Legg til linje
      </button>
    </div>
  );
}

export function ContractDocumentView(props: {
  document: FrozenContractDocument;
  acceptance?: { fullName: string; acceptedAt: string } | null;
  className?: string;
  paymentPlanEditable?: boolean;
  /** Turns the contract text itself into inputs. */
  editing?: boolean;
  onDocumentChange?: (doc: FrozenContractDocument) => void;
  installments?: FrozenInstallment[];
  paymentTerms?: string;
  onInstallmentsChange?: (rows: EditableInstallment[]) => void;
  onPaymentTermsChange?: (value: string) => void;
}) {
  const doc = props.document;
  const pkg = primaryPackageLine(doc.booking.lineItems);
  const inclusions = packageInclusions(pkg?.description, pkg?.name);
  const addons = contractExtraLines(doc.booking.lineItems);
  const headline = pkg ? packageHeadline(pkg.name) : null;
  const legalTerms = resolvedLegalTerms(doc.terms.legalTerms);
  const parties = contractPartyFacts(doc);
  const editing = Boolean(props.editing && props.onDocumentChange);

  function patch<G extends "issuer" | "customer" | "booking" | "terms">(
    group: G,
    values: Partial<FrozenContractDocument[G]>,
  ) {
    const next = { ...doc, [group]: { ...doc[group], ...values } };
    if (group === "booking" && "lineItems" in values) {
      next.booking = { ...next.booking, totalNok: lineItemsTotalNok(next.booking.lineItems) };
    }
    props.onDocumentChange?.(next);
  }
  const orNull = (v: string) => v || null;

  const lessorEdit: EditRow[] = [
    { label: "Navn", value: doc.issuer.legalName, onChange: (v) => patch("issuer", { legalName: v }) },
    { label: "Org.nr", value: doc.issuer.orgNumber, onChange: (v) => patch("issuer", { orgNumber: v }) },
    {
      label: "Adresse",
      value: doc.issuer.addressLines.join(", "),
      onChange: (v) => patch("issuer", { addressLines: v.split(",").map((x) => x.trim()) }),
    },
    { label: "Telefon", value: doc.issuer.phone ?? "", onChange: (v) => patch("issuer", { phone: orNull(v) }) },
    { label: "E-post", value: doc.issuer.email ?? "", onChange: (v) => patch("issuer", { email: orNull(v) }) },
    { label: "Kontonummer", value: doc.issuer.bankAccount ?? "", onChange: (v) => patch("issuer", { bankAccount: orNull(v) }) },
  ];
  const lesseeEdit: EditRow[] = [
    { label: "Navn", value: doc.customer.name, onChange: (v) => patch("customer", { name: v }) },
    { label: "Firma", value: doc.customer.companyName ?? "", onChange: (v) => patch("customer", { companyName: orNull(v) }) },
    { label: "E-post", value: doc.customer.email ?? "", onChange: (v) => patch("customer", { email: orNull(v) }) },
    { label: "Telefon", value: doc.customer.phone ?? "", onChange: (v) => patch("customer", { phone: orNull(v) }) },
    { label: "Adresse", value: doc.customer.address ?? "", onChange: (v) => patch("customer", { address: orNull(v) }) },
    { label: "Lokale", value: doc.booking.venueName ?? "", onChange: (v) => patch("booking", { venueName: orNull(v) }) },
    { label: "Dato", value: doc.booking.eventStart, onChange: (v) => patch("booking", { eventStart: v }) },
    {
      label: "Gjester",
      type: "number",
      value: String(doc.booking.guestCount),
      onChange: (v) => patch("booking", { guestCount: Number(v) || 0 }),
    },
  ];

  return (
    <article
      className={cn(
        RN_CARD_SHELL,
        "space-y-8 !rounded-2xl !border-0 p-5 text-sm leading-relaxed !shadow-none ring-1 ring-foreground/8 md:p-10",
        props.className,
      )}
    >
      <header className="space-y-1 border-b border-foreground/15 pb-6 text-center">
        <h2 className="font-heading text-3xl font-bold tracking-wide">LEIEAVTALE</h2>
        <p className="font-heading text-lg font-semibold">{contractHeadingIssuerName(doc)}</p>
        {headline ? (
          <p className="inline-flex rounded-full bg-success/10 px-4 py-1 text-sm font-semibold tracking-wide text-success dark:!text-white">{headline}</p>
        ) : null}
      </header>

      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        <section className="space-y-3">
          <h3 className="font-heading text-base font-bold">1. Parter i avtalen</h3>
          <p className="text-sm font-bold uppercase tracking-wide">Utleier</p>
          {editing ? <ContractEditList rows={lessorEdit} /> : <ContractFactList rows={parties.lessor} />}
        </section>
        <section className="space-y-3">
          <h3 className="font-heading text-base font-bold">2. Leietakers opplysninger</h3>
          <p className="text-sm font-bold uppercase tracking-wide">Leietaker</p>
          {editing ? <ContractEditList rows={lesseeEdit} /> : <ContractFactList rows={parties.lessee} />}
        </section>
      </div>

      <section className="space-y-5">
        <h3 className="font-heading text-base font-bold">3. Leiesum og betalingsplan</h3>
        {editing ? (
          <ContractLineEditor
            lines={doc.booking.lineItems}
            onChange={(lines) => patch("booking", { lineItems: lines })}
          />
        ) : null}
        {!editing && pkg ? (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-semibold">{chosenPackageLabel(pkg.name)}</p>
              <p className="shrink-0 tabular-nums">{formatContractNok(pkg.unitAmountNok)}</p>
            </div>
            {inclusions.tagline ? (
              <p className="font-bold">{inclusions.tagline}</p>
            ) : null}
            {inclusions.features.length ? (
              <ul className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
                {inclusions.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/70" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {inclusions.footer ? (
              <p className="text-muted-foreground">{inclusions.footer}</p>
            ) : null}
          </div>
        ) : null}
        {!editing && addons.length ? (
          <div className="space-y-2">
            <p className="text-sm font-bold uppercase tracking-wide">Tillegg</p>
            <ul className="divide-y divide-foreground/10 border-y border-foreground/10">
              {addons.map((item) => {
                const note = summarizeContractExtra(item.description);
                const amount = formatContractLineAmount(item.unitAmountNok);
                const showNote =
                  Boolean(note) &&
                  !(item.unitAmountNok === 0 && /avtale/i.test(note ?? ""));
                return (
                  <li key={`${item.kind}-${item.name}`} className="py-2">
                    <div className="flex items-baseline justify-between gap-4">
                      <p>{item.name}</p>
                      <p className="shrink-0 tabular-nums">{amount}</p>
                    </div>
                    {showNote ? (
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{note}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <ContractPaymentPlan
          eventStart={doc.booking.eventStart}
          totalNok={doc.booking.totalNok}
          bankAccount={doc.issuer.bankAccount}
          installments={props.installments ?? doc.booking.installments}
          paymentTerms={props.paymentTerms ?? doc.terms.paymentTerms}
          editable={props.paymentPlanEditable}
          onInstallmentsChange={props.onInstallmentsChange}
          onPaymentTermsChange={props.onPaymentTermsChange}
        />
      </section>

      {editing ? (
        <section className="space-y-2">
          <h3 className="font-heading text-base font-bold">4. Betingelser</h3>
          <Textarea
            rows={18}
            value={doc.terms.legalTerms}
            onChange={(e) => patch("terms", { legalTerms: e.target.value })}
          />
        </section>
      ) : legalTerms ? (
        <section className="space-y-1">
          {splitContractTermLines(legalTerms).map((line, index) => {
            if (!line.text.trim()) {
              return <div key={`gap-${index}`} className="h-2" />;
            }
            if (line.kind === "section") {
              return (
                <h3 key={`sec-${index}`} className="font-heading pt-4 text-base font-bold">
                  {line.text.trim()}
                </h3>
              );
            }
            if (line.kind === "subtitle") {
              return (
                <p key={`sub-${index}`} className="pt-3 font-semibold">
                  {line.text.trim()}
                </p>
              );
            }
            return (
              <p key={`body-${index}`} className="leading-relaxed">
                {emphasizeWifiPassword(line.text).map((part, partIndex) =>
                  part.bold ? (
                    <strong key={partIndex}>{part.text}</strong>
                  ) : (
                    <span key={partIndex}>{part.text}</span>
                  ),
                )}
              </p>
            );
          })}
        </section>
      ) : null}

      {doc.terms.specialTerms.trim() ? (
        <section className="space-y-2">
          <h3 className="font-heading text-base font-bold">Særlige avtalevilkår</h3>
          <p className="whitespace-pre-wrap">{doc.terms.specialTerms}</p>
        </section>
      ) : null}

      {doc.booking.customerFacingNotes ? (
        <section className="space-y-2">
          <h3 className="font-heading text-base font-bold">Merknader</h3>
          <p className="whitespace-pre-wrap">{doc.booking.customerFacingNotes}</p>
        </section>
      ) : null}

      <section className="space-y-4">
        <h3 className="font-heading text-base font-bold">8. Signatur</h3>
        {editing ? (
          <Textarea
            rows={2}
            value={doc.terms.acceptanceDeclaration}
            onChange={(e) => patch("terms", { acceptanceDeclaration: e.target.value })}
          />
        ) : (
          <p>
            {doc.terms.acceptanceDeclaration ||
              "Jeg bekrefter å ha lest og forstått leieavtalen, informasjonsskrivet og ryddeplanen."}
          </p>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm font-bold uppercase tracking-wide">Utleier</p>
{contractSignatureUrl(doc) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={contractSignatureUrl(doc) ?? undefined}
                alt={contractSignerName(doc)}
                className="h-14 w-auto max-w-[16rem] object-contain object-left"
              />
            ) : null}
            <p className="font-medium">{contractSignerName(doc)}</p>
            <p>{contractHeadingIssuerName(doc)}</p>
            <p>Sted/Dato: {lessorPlaceDate(doc)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold uppercase tracking-wide">Leietaker</p>
            {props.acceptance ? (
              <>
                <p className="font-heading pt-3 text-xl font-semibold italic">
                  {props.acceptance.fullName}
                </p>
                <p>{doc.customer.name}</p>
                <p>Sted/Dato: {formatContractDateTime(props.acceptance.acceptedAt)}</p>
              </>
            ) : (
              <p className="pt-10">Sted/Dato:</p>
            )}
          </div>
        </div>
        <p className="italic">{contractClosingLine(doc)}</p>
      </section>
    </article>
  );
}
