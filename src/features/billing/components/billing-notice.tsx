import type { ReactNode } from "react";

import type { BillingNoticeTone } from "@/features/billing/lib/billing-view";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<BillingNoticeTone | "success", string> = {
  danger: "border-status-danger-border bg-status-danger-bg text-status-danger-text",
  warning: "border-status-warning-border bg-status-warning-bg text-status-warning-text",
  info: "border-status-info-border bg-status-info-bg text-status-info-text",
  success: "border-status-success-border bg-status-success-bg text-status-success-text",
};

/** A banner for one message about the subscription. Alerts for problems, status for calm information. */
export function BillingNotice({
  tone,
  title,
  children,
}: {
  tone: BillingNoticeTone | "success";
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn("rounded-2xl border px-4 py-3.5 md:px-5 md:py-4", TONE_CLASS[tone])}
    >
      <p className="text-app-sm font-semibold">{title}</p>
      <div className="mt-1 text-app-sm leading-relaxed">{children}</div>
    </div>
  );
}
