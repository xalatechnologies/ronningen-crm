"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentOrganization } from "@/hooks/use-current-organization";

export function OrganizationSwitcher() {
  const {
    organizations,
    currentOrganizationId,
    setCurrentOrganizationId,
    loading,
  } = useCurrentOrganization();

  if (loading || organizations.length <= 1) {
    return null;
  }

  return (
    <Select
      value={currentOrganizationId ?? undefined}
      onValueChange={(value) => {
        if (value) void setCurrentOrganizationId(value);
      }}
    >
      <SelectTrigger className="h-9 min-w-[10rem] max-w-[14rem] border-2 border-rn-border-strong bg-card text-app-sm">
        <SelectValue placeholder="Velg organisasjon" />
      </SelectTrigger>
      <SelectContent>
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
