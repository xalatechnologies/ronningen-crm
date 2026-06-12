"use client";

import { AdminLinkButton } from "@/components/admin/admin-action-button";
import { AdminPlanBadge } from "@/components/admin/admin-badges";
import { adminOrganizationsHref } from "@/lib/admin/dashboard-links";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import Link from "next/link";

function planFilterHref(plan: string): string | null {
  if (plan === "enterprise") {
    return adminOrganizationsHref({ status: "enterprise" });
  }
  return null;
}

export function AdminPlanDistributionPanel({
  planCounts,
  className,
  embedded = false,
}: {
  planCounts: Record<string, number>;
  className?: string;
  embedded?: boolean;
}) {
  const entries = Object.entries(planCounts).sort(([, a], [, b]) => b - a);

  return (
    <section
      className={cn(
        embedded
          ? "min-w-0"
          : cn(
              RN_CARD_SHELL,
              "p-[length:var(--app-card-padding)] md:p-[length:calc(var(--app-card-padding)+0.25rem)]",
            ),
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="app-section-title">Planfordeling</h2>
        <AdminLinkButton href={adminOrganizationsHref()}>
          Alle organisasjoner
        </AdminLinkButton>
      </div>
      {entries.length === 0 ? (
        <p className="mt-4 app-text-muted">Ingen organisasjoner registrert.</p>
      ) : (
        <ul className="mt-5 space-y-2">
          {entries.map(([plan, count]) => {
            const href = planFilterHref(plan);
            const content = (
              <>
                <AdminPlanBadge plan={plan} />
                <span className="font-heading text-app-md font-bold tabular-nums">
                  {count}
                </span>
              </>
            );

            if (!href) {
              return (
                <li
                  key={plan}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-2 app-text"
                >
                  {content}
                </li>
              );
            }

            return (
              <li key={plan}>
                <Link
                  href={href}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/40"
                >
                  {content}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
