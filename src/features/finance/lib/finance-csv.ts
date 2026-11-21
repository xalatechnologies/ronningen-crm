import type { TransactionListItem } from "@/features/finance/types";
import type { Translator } from "@/i18n/types";
import { isIncomeTransactionType } from "@/lib/transaction-income";

export function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadTransactionsCsv(rows: TransactionListItem[], t: Translator) {
  const headers = [
    t("finance.csv.date"),
    t("finance.csv.venue"),
    t("finance.csv.description"),
    t("finance.csv.category"),
    t("finance.csv.type"),
    t("finance.csv.amount"),
  ];
  const lines = rows.map((r) =>
    [
      r.transaction_date,
      r.propertyName ?? "",
      r.description ?? "",
      r.category,
      isIncomeTransactionType(r.type) ? t("finance.csv.income") : t("finance.csv.expense"),
      String(r.amount),
    ].map(csvEscape).join(","),
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([`\ufeff${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = t("finance.csv.filename", {
    date: new Date().toISOString().slice(0, 10),
  });
  a.click();
  URL.revokeObjectURL(url);
}
