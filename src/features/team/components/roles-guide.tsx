"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import { USER_ROLES, type UserRole } from "@/constants/roles";
import { useTranslation } from "@/i18n/client";
import { roleLabel } from "@/lib/navigation/nav-labels";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

export function RolesGuide({ myRole }: { myRole: UserRole | null }) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="team-roles-title" className={cn("flex flex-col gap-4 p-5 md:p-6", RN_CARD_SHELL)}>
      <div>
        <h2 id="team-roles-title" className="font-heading text-lg font-bold">
          {t("settings.team.rolesGuideTitle")}
        </h2>
        <p className="mt-1 text-app-sm text-muted-foreground">{t("settings.team.rolesGuideDescription")}</p>
      </div>
      <dl className="divide-y divide-foreground/10">
        {USER_ROLES.map((r) => (
          <div key={r} className="grid gap-1 py-3 first:pt-0 last:pb-0 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-6">
            <dt className="flex items-center gap-2 font-semibold text-foreground">
              {roleLabel(r, t)}
              {r === myRole ? (
                <StatusBadge tone="info" dot={false}>
                  {t("settings.team.yourRole")}
                </StatusBadge>
              ) : null}
            </dt>
            <dd className="text-app-sm text-muted-foreground">{t(`settings.team.roleDesc.${r}`)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
