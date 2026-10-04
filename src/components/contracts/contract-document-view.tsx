import { ContractPaymentPlan, type EditableInstallment } from "@/components/contracts/contract-payment-plan";
import {
  CONTRACT_CLOSING_LINE,
  LESSOR_SIGNATURE_NAME,
  LESSOR_SIGNATURE_SRC,
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
import type { FrozenContractDocument, FrozenInstallment } from "@/lib/contracts/types";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

function ContractFactList({ rows }: { rows: ContractFactRow[] }) {
  return (
    <dl className="grid grid-cols-[5.75rem_minmax(0,1fr)] gap-x-3 gap-y-1.5">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0 wrap-break-word">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ContractDocumentView(props: {
  document: FrozenContractDocument;
  acceptance?: { fullName: string; acceptedAt: string } | null;
  className?: string;
  paymentPlanEditable?: boolean;
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

  return (
    <article
      className={cn(RN_CARD_SHELL, "space-y-8 p-5 text-sm leading-relaxed md:p-8", props.className)}
    >
      <header className="space-y-1 border-b-2 border-rn-border-strong pb-4 text-center">
        <h2 className="font-heading text-2xl font-bold tracking-wide">LEIEAVTALE</h2>
        <p className="font-heading text-lg font-semibold">{contractHeadingIssuerName(doc)}</p>
        {headline ? (
          <p className="text-base font-semibold tracking-wide">{headline}</p>
        ) : null}
      </header>

      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        <section className="space-y-3">
          <h3 className="font-heading text-base font-bold">1. Parter i avtalen</h3>
          <p className="text-sm font-bold uppercase tracking-wide">Utleier</p>
          <ContractFactList rows={parties.lessor} />
        </section>
        <section className="space-y-3">
          <h3 className="font-heading text-base font-bold">2. Leietakers opplysninger</h3>
          <p className="text-sm font-bold uppercase tracking-wide">Leietaker</p>
          <ContractFactList rows={parties.lessee} />
        </section>
      </div>

      <section className="space-y-5">
        <h3 className="font-heading text-base font-bold">3. Leiesum og betalingsplan</h3>
        {pkg ? (
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
        {addons.length ? (
          <div className="space-y-2">
            <p className="text-sm font-bold uppercase tracking-wide">Tillegg</p>
            <ul className="divide-y divide-rn-border-strong/60 border-y border-rn-border-strong/60">
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

      {legalTerms ? (
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
        <p>
          {doc.terms.acceptanceDeclaration ||
            "Jeg bekrefter å ha lest og forstått leieavtalen, informasjonsskrivet og ryddeplanen."}
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm font-bold uppercase tracking-wide">Utleier</p>
            <img
              src={LESSOR_SIGNATURE_SRC}
              alt={LESSOR_SIGNATURE_NAME}
              className="h-14 w-auto max-w-[16rem] object-contain object-left"
            />
            <p className="font-medium">{LESSOR_SIGNATURE_NAME}</p>
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
                <p>{props.acceptance.fullName}</p>
                <p>Sted/Dato: {formatContractDateTime(props.acceptance.acceptedAt)}</p>
              </>
            ) : (
              <p className="pt-10">Sted/Dato:</p>
            )}
          </div>
        </div>
        <p className="italic">{CONTRACT_CLOSING_LINE}</p>
      </section>
    </article>
  );
}
