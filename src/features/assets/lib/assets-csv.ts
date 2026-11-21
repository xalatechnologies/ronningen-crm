import type { AssetListItem } from "@/features/assets/types";
import type { Translator } from "@/i18n/types";

export function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadAssetsCsv(rows: AssetListItem[], t: Translator) {
  const headers = [
    t("assets.csv.name"),
    t("assets.csv.venue"),
    t("assets.csv.quantity"),
    t("assets.csv.value"),
    t("assets.csv.condition"),
    t("assets.csv.insurance"),
  ];
  const lines = rows.map((a) =>
    [
      a.name,
      a.propertyName ?? "",
      String(a.quantity),
      String(a.value),
      a.condition ?? "",
      a.insurance_status ?? "",
    ].map(csvEscape).join(","),
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([`\ufeff${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const el = document.createElement("a");
  el.href = url;
  el.download = t("assets.csv.filename", {
    date: new Date().toISOString().slice(0, 10),
  });
  el.click();
  URL.revokeObjectURL(url);
}
