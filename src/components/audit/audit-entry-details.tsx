import Link from "next/link";

import type { AuditDescription } from "@/lib/audit/describe-audit-entry";
import type { Translator } from "@/i18n/types";

type Props = {
  description: AuditDescription;
  fieldLabels: Record<string, string>;
  rowId: string;
  t: Translator;
};

export function auditFieldLabel(
  fieldKey: string,
  fieldLabels: Record<string, string>,
): string {
  return Object.hasOwn(fieldLabels, fieldKey) ? fieldLabels[fieldKey] : fieldKey;
}

/** Human-readable detail lines for one audit entry (shared by table and cards). */
export function AuditEntryDetails({ description, fieldLabels, rowId, t }: Props) {
  const label = (key: string) => auditFieldLabel(key, fieldLabels);
  const { kind, changes, changedFieldKeys, summary, redacted } = description;

  let body: React.ReactNode;
  if (kind === "changed" && redacted) {
    body = (
      <>
        <p>
          <span className="text-muted-foreground">
            {t("appPages.settings.activity.changedFields")}
          </span>{" "}
          {changedFieldKeys.map(label).join(", ") || "—"}
        </p>
        <p className="text-muted-foreground">
          {t("appPages.settings.activity.redactedNote")}
        </p>
      </>
    );
  } else if (kind === "changed") {
    body =
      changes.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {changes.map((c) => (
            <li key={c.fieldKey} className="break-words">
              <span className="font-semibold">{label(c.fieldKey)}:</span>{" "}
              <span className="text-muted-foreground line-through">{c.oldValue}</span>{" "}
              <span aria-hidden>→</span>
              <span className="sr-only">→</span> <span>{c.newValue}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          {t("appPages.settings.activity.noDetails")}
        </p>
      );
  } else {
    body =
      summary.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {summary.map((s) => (
            <li key={s.fieldKey} className="break-words">
              <span className="font-semibold">{label(s.fieldKey)}:</span> {s.value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          {t("appPages.settings.activity.noDetails")}
        </p>
      );
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-app-sm">
      {body}
      {description.table === "bookings" && kind !== "deleted" && rowId ? (
        <Link
          href={`/app/bookings/${encodeURIComponent(rowId)}`}
          className="w-fit rounded-sm font-semibold text-success underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 dark:!text-white"
        >
          {t("appPages.settings.activity.openBooking")}
        </Link>
      ) : null}
    </div>
  );
}
