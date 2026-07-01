#!/usr/bin/env node
/**
 * Convert remaining app components to useTranslation().
 * Run: node scripts/i18n-remaining-batch.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

function ensureImport(content) {
  if (content.includes('from "@/i18n/client"')) return content;
  const lines = content.split("\n");
  let insertAt = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("import ")) insertAt = i + 1;
    else if (insertAt > 0 && lines[i].trim() === "") break;
  }
  lines.splice(
    insertAt,
    0,
    'import { useTranslation } from "@/i18n/client";',
  );
  return lines.join("\n");
}

function ensureHook(content, fnName) {
  const hook = "  const { t, formatCurrency, formatDate, locale } = useTranslation();";
  const hookSimple = "  const { t, locale } = useTranslation();";
  const hookFmt = "  const { t, formatCurrency, locale } = useTranslation();";

  if (content.includes("useTranslation()")) return content;

  const patterns = [
    new RegExp(`(export function ${fnName}\\([^)]*\\)\\s*\\{)`),
    new RegExp(`(function ${fnName}\\([^)]*\\)\\s*\\{)`),
  ];
  for (const re of patterns) {
    if (re.test(content)) {
      const useSimple = fnName.includes("Calendar") || fnName.includes("Panel");
      const useFmt = fnName.includes("Workspace") || fnName.includes("Section");
      const hookLine = useFmt ? hookFmt : useSimple ? hookSimple : hook;
      return content.replace(re, `$1\n${hookLine}`);
    }
  }
  return content;
}

const fileReplacements = {
  "src/components/invoices/invoices-workspace.tsx": [
    ['import { BOOKING_PAYMENT_STATUS_LABELS } from "@/constants/booking-payment-status";', 'import { bookingPaymentStatusLabel } from "@/constants/booking-payment-status";'],
    ['function formatNok(n: number) {\n  return new Intl.NumberFormat("nb-NO", {\n    style: "currency",\n    currency: "NOK",\n    maximumFractionDigits: 0,\n  }).format(n);\n}\n\nfunction formatMediumDate(iso: string) {\n  return new Intl.DateTimeFormat("nb-NO", {\n    day: "numeric",\n    month: "short",\n    year: "numeric",\n  }).format(new Date(`${iso.slice(0, 10)}T12:00:00`));\n}\n\nfunction formatNoticeDate(iso: string) {\n  return new Intl.DateTimeFormat("nb-NO", {\n    day: "numeric",\n    month: "short",\n    year: "numeric",\n  }).format(new Date(iso));\n}\n\n', ''],
    ['function DueAndWarnings({\n  row,\n  todayYmd,\n}: {\n  row: UnpaidInvoiceRow;\n  todayYmd: string;\n}) {', 'function DueAndWarnings({\n  row,\n  todayYmd,\n}: {\n  row: UnpaidInvoiceRow;\n  todayYmd: string;\n}) {\n  const { t, formatDate } = useTranslation();'],
    ['function PaymentColumn({ row }: { row: UnpaidInvoiceRow }) {', 'function PaymentColumn({ row }: { row: UnpaidInvoiceRow }) {\n  const { t, formatCurrency } = useTranslation();'],
    ['const statusLabel = BOOKING_PAYMENT_STATUS_LABELS[row.paymentStatus];', 'const paymentLabel = bookingPaymentStatusLabel(row.paymentStatus, t);'],
    ['{statusLabel}', '{paymentLabel}'],
    ['relLabel = "Forfall i dag";', 'relLabel = t("invoices.workspace.dueToday");'],
    ['relLabel = rel === 1 ? "1 dag over forfall" : `${rel} dager over forfall`;', 'relLabel = rel === 1 ? t("invoices.workspace.oneDayOverdue") : t("invoices.workspace.daysOverdue", { count: rel });'],
    ['relLabel = "Forfaller i morgen";', 'relLabel = t("invoices.workspace.dueTomorrow");'],
    ['relLabel = `Forfaller om ${Math.abs(rel)} dager`;', 'relLabel = t("invoices.workspace.dueInDays", { count: Math.abs(rel) });'],
    ['{formatMediumDate(due)}', '{formatDate(`${due.slice(0, 10)}T12:00:00`)}'],
    ['Eget forfall', '{t("invoices.workspace.customDue")}'],
    ['Forfalt · {relLabel}', '{t("invoices.workspace.overdueBadge", { label: relLabel })}'],
    ['Forfall i dag', '{t("invoices.workspace.dueToday")}'],
    ['Innkassovarsel registrert {formatNoticeDate(row.collectionNoticeSentAt)}', '{t("invoices.workspace.collectionNotice", { date: formatDate(row.collectionNoticeSentAt) })}'],
    ['Vurder innkassovarsel (14+ dager over forfall)', '{t("invoices.workspace.suggestCollection")}'],
    ['{pct}% betalt', '{t("invoices.workspace.percentPaid", { pct })}'],
    ['aria-label={`Betalt ${pct} prosent`}', 'aria-label={t("invoices.workspace.paidProgressAria", { pct })}'],
    ['{formatNok(row.paidNok)}', '{formatCurrency(row.paidNok)}'],
    ['{formatNok(row.totalNok)}', '{formatCurrency(row.totalNok)}'],
    ['{formatNok(r.remainingNok)}', '{formatCurrency(r.remainingNok)}'],
    ['{formatNok(markPaidConfirmRow.totalNok)}', '{formatCurrency(markPaidConfirmRow.totalNok)}'],
    ['{formatNok(0)}', '{formatCurrency(0)}'],
    ['title="Registrer at kunden har betalt hele beløpet"', 'title={t("invoices.workspace.markPaidTitle")}'],
    ['Registrer betalt', '{t("invoices.workspace.markPaid")}'],
    ['aria-label="Ingen utestående fakturaer"', 'aria-label={t("invoices.noOutstandingAria")}'],
    ['Ingen utestående fakturaer. Når en booking har restbeløp, vises den\n            her med betalingsstatus, forfall og verktøy for oppfølging.', '{t("invoices.workspace.emptyDescription")}'],
    ['Gå til bookinger', '{t("invoices.workspace.goToBookings")}'],
    ['aria-label="Fakturaliste"', 'aria-label={t("invoices.workspace.listAria")}'],
    ['Ingen treff i filteret', '{t("invoices.workspace.filterEmptyTitle")}'],
    ['Velg et annet segment over, eller vis alle ubetalte.', '{t("invoices.workspace.filterEmptyHint")}'],
    ['<th className={invoicesTableHeadClass}>Kunde</th>', '<th className={invoicesTableHeadClass}>{t("invoices.customer")}</th>'],
    ['Arrangement', '{t("invoices.workspace.tableEvent")}'],
    ['Betaling', '{t("invoices.workspace.tablePayment")}'],
    ['Forfall', '{t("invoices.dueDate")}'],
    ['Rest', '{t("invoices.workspace.tableRemaining")}'],
    ['<span className="sr-only">Faktura og registrer betaling</span>', '<span className="sr-only">{t("invoices.workspace.tableActionsSr")}</span>'],
    ['å betale', '{t("invoices.workspace.toPay")}'],
    ['Faktura {formatNok(r.totalNok)}', '{t("invoices.workspace.invoiceAmount", { amount: formatCurrency(r.totalNok) })}'],
    ['Faktura', '{t("invoices.title")}'],
    ['toast.error("Kunne ikke oppdatere betaling"', 'toast.error(t("invoices.workspace.updatePaymentFailed")'],
    ['toast.success("Bookingen er markert som fullt betalt")', 'toast.success(t("invoices.workspace.markedPaid"))'],
    ['title="Registrer full betaling"', 'title={t("invoices.workspace.confirmMarkPaidTitle")}'],
    ['Total innbetaling', '{t("invoices.workspace.totalPayment")}'],
    ['Restbeløp etterpå', '{t("invoices.remainingAfter")}'],
    ['Bekreft at kunden har betalt hele beløpet for{" "}', '{t("invoices.workspace.confirmMarkPaidIntro", { customer: '],
    ['confirmLabel="Ja, registrer betalt"', 'confirmLabel={t("invoices.workspace.confirmMarkPaid")}'],
    ['busyLabel="Registrerer…"', 'busyLabel={t("invoices.workspace.registering")}'],
    ['Ref.&nbsp;{r.bookingReference}', '{t("invoices.workspace.refPrefix")}&nbsp;{r.bookingReference}'],
  ],
};

for (const [file, reps] of Object.entries(fileReplacements)) {
  let content = readFileSync(file, "utf8");
  content = ensureImport(content);
  content = ensureHook(content, "InvoicesWorkspace");
  for (const [from, to] of reps) {
    content = content.split(from).join(to);
  }
  writeFileSync(file, content);
  console.log("Updated", file);
}
