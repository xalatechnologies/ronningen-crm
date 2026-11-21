import type { StatusTone } from "@/components/ui/status-badge";
import type { Translator } from "@/i18n/types";
import { assetInsuranceBucket, assetStatusBucket } from "@/lib/asset-status-bucket";

export type StatusFilterId = "all" | "operational" | "maintenance" | "replace";

export function statusFilterLabel(
  id: StatusFilterId,
  t: Translator,
): string {
  return t(`assets.status.${id}`);
}

export function insurancePresentation(
  status: string | null,
  t: Translator,
): {
  safeLabel: string;
  tone: "ok" | "warn" | "bad";
} {
  const bucket = assetInsuranceBucket(status);
  if (bucket === "covered") {
    return { safeLabel: t("assets.insurance.covered"), tone: "ok" };
  }
  if (bucket === "excluded") {
    return { safeLabel: t("assets.insurance.excluded"), tone: "bad" };
  }
  if (bucket === "unknown") {
    return { safeLabel: t("assets.insurance.unknown"), tone: "warn" };
  }
  const raw = (status ?? "").replaceAll("\u00a0", " ").trim();
  return { safeLabel: raw || t("assets.insurance.unknown"), tone: "warn" };
}

export function conditionTone(condition: string | null): StatusTone {
  const b = assetStatusBucket(condition);
  if (b === "operational") return "success";
  if (b === "maintenance") return "warning";
  return "danger";
}

export const INSURANCE_TONE: Record<"ok" | "warn" | "bad", StatusTone> = {
  ok: "success",
  warn: "warning",
  bad: "danger",
};
