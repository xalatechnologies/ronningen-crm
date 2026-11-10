import type { Locale } from "@/i18n/config";
import { formatCurrency, formatDate } from "@/i18n/formatters";
import type { TranslationKey } from "@/i18n/types";
import { formatAuditTimestamp } from "@/lib/audit/format-audit-time";

export const AUDIT_TABLES = [
  "bookings",
  "customers",
  "transactions",
  "booking_payment_installments",
  "organization_members",
] as const;

export type AuditTableName = (typeof AUDIT_TABLES)[number];

export function isAuditTableName(value: unknown): value is AuditTableName {
  return AUDIT_TABLES.some((t) => t === value);
}

export const AUDIT_TABLE_LABEL_KEYS: Record<AuditTableName, TranslationKey> = {
  bookings: "appPages.settings.activity.tables.bookings",
  customers: "appPages.settings.activity.tables.customers",
  transactions: "appPages.settings.activity.tables.transactions",
  booking_payment_installments:
    "appPages.settings.activity.tables.booking_payment_installments",
  organization_members: "appPages.settings.activity.tables.organization_members",
};

export type AuditEntryInput = {
  table_name: string;
  op: string;
  changed_fields: string[] | null;
  old_data: unknown;
  new_data: unknown;
};

export type AuditChange = {
  fieldKey: string;
  oldValue: string;
  newValue: string;
};

export type AuditSummaryItem = {
  fieldKey: string;
  value: string;
};

export type AuditDescription = {
  kind: "created" | "changed" | "deleted";
  /** Known table, or null when the table name is unexpected (show raw name). */
  table: AuditTableName | null;
  /** Value diff lines (UPDATE only; empty for redacted tables). */
  changes: AuditChange[];
  /** Changed column names (UPDATE only), used when values are redacted. */
  changedFieldKeys: string[];
  /** Key facts for INSERT/DELETE rows. */
  summary: AuditSummaryItem[];
  /** True when the table never exposes values (customers). */
  redacted: boolean;
};

const REDACTED_TABLES: readonly string[] = ["customers"];
const MONEY_FIELDS: readonly string[] = [
  "total_price",
  "paid_amount",
  "remaining_amount",
  "amount",
];
const IGNORED_FIELDS: readonly string[] = ["updated_at"];
const MAX_TEXT_LENGTH = 80;

const SUMMARY_FIELDS: Record<AuditTableName, readonly string[]> = {
  bookings: ["booking_reference", "event_date", "status"],
  customers: [],
  transactions: ["type", "amount", "category"],
  booking_payment_installments: ["amount", "due_date", "status"],
  organization_members: ["role"],
};

const BOOLEAN_LABELS: Record<Locale, { yes: string; no: string }> = {
  nb: { yes: "Ja", no: "Nei" },
  en: { yes: "Yes", no: "No" },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function truncate(text: string): string {
  return text.length > MAX_TEXT_LENGTH
    ? `${text.slice(0, MAX_TEXT_LENGTH - 1)}…`
    : text;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Display string for one audit value. Never throws. */
export function formatAuditValue(
  fieldKey: string,
  value: unknown,
  locale: Locale,
): string {
  try {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") {
      const labels = BOOLEAN_LABELS[locale];
      return value ? labels.yes : labels.no;
    }
    if (MONEY_FIELDS.includes(fieldKey)) {
      const n = toNumber(value);
      if (n !== null) return formatCurrency(locale, n);
    }
    if (typeof value === "number") return String(value);
    if (typeof value === "string") {
      if (value === "") return "—";
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const d = new Date(`${value}T12:00:00`);
        return Number.isNaN(d.getTime()) ? value : formatDate(locale, d);
      }
      if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
        return formatAuditTimestamp(value, locale);
      }
      return truncate(value);
    }
    return truncate(JSON.stringify(value) ?? "—");
  } catch {
    return "—";
  }
}

function summarize(
  table: AuditTableName | null,
  data: unknown,
  locale: Locale,
): AuditSummaryItem[] {
  if (!table || !isRecord(data)) return [];
  const items: AuditSummaryItem[] = [];
  for (const fieldKey of SUMMARY_FIELDS[table]) {
    const value = data[fieldKey];
    if (value === null || value === undefined) continue;
    items.push({ fieldKey, value: formatAuditValue(fieldKey, value, locale) });
  }
  return items;
}

export function describeAuditEntry(
  entry: AuditEntryInput,
  locale: Locale,
): AuditDescription {
  const table = isAuditTableName(entry.table_name) ? entry.table_name : null;
  const redacted = REDACTED_TABLES.includes(entry.table_name);
  const kind =
    entry.op === "INSERT"
      ? "created"
      : entry.op === "DELETE"
        ? "deleted"
        : "changed";

  if (kind !== "changed") {
    return {
      kind,
      table,
      changes: [],
      changedFieldKeys: [],
      redacted,
      summary: redacted
        ? []
        : summarize(
            table,
            kind === "created" ? entry.new_data : entry.old_data,
            locale,
          ),
    };
  }

  const fromDiff = Array.isArray(entry.changed_fields)
    ? entry.changed_fields.filter((f): f is string => typeof f === "string")
    : [];
  const changedFieldKeys = fromDiff.filter((f) => !IGNORED_FIELDS.includes(f));

  const oldData = isRecord(entry.old_data) ? entry.old_data : {};
  const newData = isRecord(entry.new_data) ? entry.new_data : {};
  const changes: AuditChange[] = redacted
    ? []
    : changedFieldKeys.map((fieldKey) => ({
        fieldKey,
        oldValue: formatAuditValue(fieldKey, oldData[fieldKey], locale),
        newValue: formatAuditValue(fieldKey, newData[fieldKey], locale),
      }));

  return { kind, table, changes, changedFieldKeys, summary: [], redacted };
}
