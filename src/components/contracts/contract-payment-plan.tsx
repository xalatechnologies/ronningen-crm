"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  formatContractBankAccount,
  formatContractNok,
  formatInstallmentDue,
} from "@/lib/contracts/layout";
import type { FrozenInstallment } from "@/lib/contracts/types";
import { cn } from "@/lib/utils";

export type EditableInstallment = {
  label: string;
  dueDate: string | null;
  amountNok: number;
};

const cell = "border border-rn-border-strong px-2 py-2 align-top";
const head = cn(cell, "bg-muted/60 font-semibold");

export function ContractPaymentPlan(props: {
  eventStart: string;
  totalNok: number;
  bankAccount: string | null;
  installments: FrozenInstallment[];
  paymentTerms: string;
  editable?: boolean;
  onInstallmentsChange?: (rows: EditableInstallment[]) => void;
  onPaymentTermsChange?: (value: string) => void;
}) {
  const rows = props.installments.length
    ? props.installments
    : [
        {
          label: "Avtalt total",
          dueDate: null,
          amountNok: props.totalNok,
        },
      ];
  const tableTotal = props.installments.length
    ? props.installments.reduce((sum, row) => sum + row.amountNok, 0)
    : props.totalNok;

  function updateRow(index: number, patch: Partial<EditableInstallment>) {
    const next = rows.map((row, i) =>
      i === index
        ? {
            label: patch.label ?? row.label,
            dueDate: patch.dueDate === undefined ? row.dueDate : patch.dueDate,
            amountNok: patch.amountNok ?? row.amountNok,
          }
        : row,
    );
    props.onInstallmentsChange?.(next);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold uppercase tracking-wide">Betalingsplan</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-rn-border-strong text-left text-sm">
          <thead>
            <tr>
              <th className={cn(head, "w-10")}>#</th>
              <th className={head}>Beskrivelse</th>
              <th className={cn(head, "w-44")}>Forfallsdato</th>
              <th className={cn(head, "w-32 text-right")}>Beløp</th>
              {props.editable ? <th className={cn(head, "w-12")} /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.label}-${index}`}>
                <td className={cell}>{index + 1}</td>
                <td className={cell}>
                  {props.editable ? (
                    <Input
                      value={row.label}
                      onChange={(e) => updateRow(index, { label: e.target.value })}
                      className="h-9 border-0 bg-transparent px-0 shadow-none"
                    />
                  ) : (
                    row.label
                  )}
                </td>
                <td className={cell}>
                  {props.editable ? (
                    <Input
                      type="date"
                      value={row.dueDate?.slice(0, 10) ?? ""}
                      onChange={(e) =>
                        updateRow(index, {
                          dueDate: e.target.value.trim() ? e.target.value : null,
                        })
                      }
                      className="h-9 border-0 bg-transparent px-0 shadow-none"
                    />
                  ) : (
                    formatInstallmentDue(row.dueDate, props.eventStart)
                  )}
                </td>
                <td className={cn(cell, "text-right tabular-nums")}>
                  {props.editable ? (
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={Number.isFinite(row.amountNok) ? row.amountNok : 0}
                      onChange={(e) =>
                        updateRow(index, { amountNok: Number(e.target.value) || 0 })
                      }
                      className="h-9 border-0 bg-transparent px-0 text-right shadow-none"
                    />
                  ) : (
                    formatContractNok(row.amountNok)
                  )}
                </td>
                {props.editable ? (
                  <td className={cell}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={rows.length <= 1}
                      onClick={() =>
                        props.onInstallmentsChange?.(rows.filter((_, i) => i !== index))
                      }
                    >
                      ×
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
            <tr>
              <td className={cn(cell, "font-bold")} colSpan={props.editable ? 3 : 3}>
                TOTALT
              </td>
              <td className={cn(cell, "text-right font-bold tabular-nums")}>
                {formatContractNok(tableTotal)}
              </td>
              {props.editable ? <td className={cell} /> : null}
            </tr>
          </tbody>
        </table>
      </div>
      {props.editable ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            props.onInstallmentsChange?.([
              ...rows,
              {
                label: "Andre innbetaling",
                dueDate: null,
                amountNok: 0,
              },
            ])
          }
        >
          Legg til forfall
        </Button>
      ) : null}
      {props.bankAccount ? (
        <p>
          Kontonummer for betaling:{" "}
          {formatContractBankAccount(props.bankAccount) ?? props.bankAccount}
        </p>
      ) : null}
      {props.editable ? (
        <Textarea
          value={props.paymentTerms}
          onChange={(e) => props.onPaymentTermsChange?.(e.target.value)}
          rows={2}
        />
      ) : (
        <p className="font-bold">
          {props.paymentTerms || "Merk betaling med: Arrangementsdato og navn"}
        </p>
      )}
    </div>
  );
}
