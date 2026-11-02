"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/client";
import { lineItemsTotalNok } from "@/lib/contracts/overrides";
import type { FrozenContractDocument, FrozenLineItem } from "@/lib/contracts/types";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

function Field(props: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1 text-sm", props.className)}>
      <span className="font-medium">{props.label}</span>
      {props.children}
    </label>
  );
}

export function ContractDocumentEditor(props: {
  document: FrozenContractDocument;
  disabled?: boolean;
  onChange: (doc: FrozenContractDocument) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const doc = props.document;
  const disabled = props.disabled;

  function patch<G extends "issuer" | "customer" | "booking" | "terms">(
    group: G,
    values: Partial<FrozenContractDocument[G]>,
  ) {
    const next = { ...doc, [group]: { ...doc[group], ...values } };
    if (group === "booking" && "lineItems" in values) {
      next.booking = {
        ...next.booking,
        totalNok: lineItemsTotalNok(next.booking.lineItems),
      };
    }
    props.onChange(next);
  }

  function text(
    label: string,
    value: string | null,
    onValue: (value: string) => void,
    className?: string,
  ) {
    return (
      <Field label={label} className={className}>
        <Input value={value ?? ""} disabled={disabled} onChange={(e) => onValue(e.target.value)} />
      </Field>
    );
  }

  function updateLine(index: number, values: Partial<FrozenLineItem>) {
    patch("booking", {
      lineItems: doc.booking.lineItems.map((line, i) =>
        i === index ? { ...line, ...values } : line,
      ),
    });
  }

  const sectionTitle = "text-xs font-semibold uppercase tracking-wide text-rn-text-slate";

  return (
    <div className={cn(RN_CARD_SHELL, "space-y-6 p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-bold">{t("contracts.editTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("contracts.editHint")}</p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={props.onReset}>
          {t("contracts.editReset")}
        </Button>
      </div>

      <section className="space-y-3">
        <p className={sectionTitle}>{t("contracts.editSectionLessor")}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {text(t("contracts.editFieldLegalName"), doc.issuer.legalName, (v) => patch("issuer", { legalName: v }))}
          {text(t("contracts.editFieldOrgNumber"), doc.issuer.orgNumber, (v) => patch("issuer", { orgNumber: v }))}
          {text(t("contracts.editFieldPhone"), doc.issuer.phone, (v) => patch("issuer", { phone: v || null }))}
          {text(t("contracts.editFieldEmail"), doc.issuer.email, (v) => patch("issuer", { email: v || null }))}
          {text(t("contracts.editFieldBank"), doc.issuer.bankAccount, (v) => patch("issuer", { bankAccount: v || null }))}
          <Field label={t("contracts.editFieldAddress")}>
            <Textarea
              rows={2}
              disabled={disabled}
              value={doc.issuer.addressLines.join("\n")}
              onChange={(e) => patch("issuer", { addressLines: e.target.value.split("\n") })}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <p className={sectionTitle}>{t("contracts.editSectionLessee")}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {text(t("contracts.editFieldLegalName"), doc.customer.name, (v) => patch("customer", { name: v }))}
          {text(t("contracts.editFieldEmail"), doc.customer.email, (v) => patch("customer", { email: v || null }))}
          {text(t("contracts.editFieldPhone"), doc.customer.phone, (v) => patch("customer", { phone: v || null }))}
          {text(t("contracts.editFieldAddress").replace(/ \(.*\)/, ""), doc.customer.address, (v) => patch("customer", { address: v || null }))}
          {text(t("contracts.editFieldCompany"), doc.customer.companyName, (v) => patch("customer", { companyName: v || null }))}
          {text(t("contracts.editFieldOrgNumber"), doc.customer.companyOrgNumber, (v) => patch("customer", { companyOrgNumber: v || null }))}
        </div>
      </section>

      <section className="space-y-3">
        <p className={sectionTitle}>{t("contracts.editSectionEvent")}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {text(t("contracts.editFieldVenue"), doc.booking.venueName, (v) => patch("booking", { venueName: v || null }))}
          {text(t("contracts.editFieldVenueAddress"), doc.booking.venueAddress, (v) => patch("booking", { venueAddress: v || null }))}
          {text(t("contracts.editFieldEventType"), doc.booking.eventType, (v) => patch("booking", { eventType: v }))}
          <Field label={t("contracts.editFieldGuests")}>
            <Input
              type="number"
              min={0}
              disabled={disabled}
              value={doc.booking.guestCount}
              onChange={(e) => patch("booking", { guestCount: Number(e.target.value) || 0 })}
            />
          </Field>
          {text(t("contracts.editFieldStart"), doc.booking.eventStart, (v) => patch("booking", { eventStart: v }))}
          {text(t("contracts.editFieldEnd"), doc.booking.eventEnd, (v) => patch("booking", { eventEnd: v || null }))}
          {text(t("contracts.editFieldRentalStart"), doc.booking.rentalStart, (v) => patch("booking", { rentalStart: v || null }))}
          {text(t("contracts.editFieldRentalEnd"), doc.booking.rentalEnd, (v) => patch("booking", { rentalEnd: v || null }))}
        </div>
      </section>

      <section className="space-y-3">
        <p className={sectionTitle}>{t("contracts.editSectionLines")}</p>
        <div className="space-y-2">
          {doc.booking.lineItems.map((line, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1fr)_5rem_7rem_auto] items-end gap-2">
              <Field label={index === 0 ? t("contracts.editLineName") : ""}>
                <Input value={line.name} disabled={disabled} onChange={(e) => updateLine(index, { name: e.target.value })} />
              </Field>
              <Field label={index === 0 ? t("contracts.editLineQty") : ""}>
                <Input
                  type="number"
                  min={0}
                  disabled={disabled}
                  value={line.quantity}
                  onChange={(e) => updateLine(index, { quantity: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label={index === 0 ? t("contracts.editLineUnit") : ""}>
                <Input
                  type="number"
                  disabled={disabled}
                  value={line.unitAmountNok}
                  onChange={(e) => updateLine(index, { unitAmountNok: Number(e.target.value) || 0 })}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                aria-label="×"
                onClick={() =>
                  patch("booking", { lineItems: doc.booking.lineItems.filter((_, i) => i !== index) })
                }
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() =>
              patch("booking", {
                lineItems: [
                  ...doc.booking.lineItems,
                  { kind: "custom", name: "", quantity: 1, unitAmountNok: 0, description: null },
                ],
              })
            }
          >
            {t("contracts.editAddLine")}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <p className={sectionTitle}>{t("contracts.editSectionTerms")}</p>
        <Field label={t("contracts.editFieldLegalTerms")}>
          <Textarea
            rows={14}
            disabled={disabled}
            value={doc.terms.legalTerms}
            onChange={(e) => patch("terms", { legalTerms: e.target.value })}
          />
        </Field>
        <Field label={t("contracts.editFieldDeclaration")}>
          <Textarea
            rows={2}
            disabled={disabled}
            value={doc.terms.acceptanceDeclaration}
            onChange={(e) => patch("terms", { acceptanceDeclaration: e.target.value })}
          />
        </Field>
      </section>
    </div>
  );
}
