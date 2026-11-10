"use client";

import { useTranslation } from "@/i18n/client";
import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentOrganization } from "@/hooks/use-current-organization";

export function OrganizationSwitcher() {
  const { t } = useTranslation();
  const {
    organizations,
    currentOrganizationId,
    setCurrentOrganizationId,
    loading,
  } = useCurrentOrganization();

  const selectItems = useMemo(
    () =>
      organizations.map((membership) => ({
        value: membership.organizationId,
        label: membership.organization.name,
      })),
    [organizations],
  );

  if (loading || organizations.length <= 1) {
    return null;
  }

  return (
    <Select
      value={currentOrganizationId ?? undefined}
      onValueChange={(value) => {
        if (value) void setCurrentOrganizationId(value);
      }}
      items={selectItems}
    >
      <SelectTrigger className="h-9 min-w-[10rem] max-w-[14rem] border-2 border-rn-border-strong bg-card text-app-sm">
        <SelectValue placeholder={t("admin.velg_organisasjon")} />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {organizations.map((membership) => (
          <SelectItem
            key={membership.organizationId}
            value={membership.organizationId}
          >
            {membership.organization.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
