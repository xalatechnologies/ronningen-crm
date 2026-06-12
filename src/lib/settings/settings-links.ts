import type { UserRole } from "@/constants/roles";
import { canManageMembers } from "@/lib/organizations/organization-permissions";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CreditCard,
  LayoutGrid,
  LifeBuoy,
  User,
  Users,
  Building,
} from "lucide-react";

export type SettingsSection = {
  id: string;
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Nav + hub visibility */
  visible: (role: UserRole | null) => boolean;
};

function canManageOrgSettings(role: UserRole | null): boolean {
  return canManageMembers(role);
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "overview",
    href: "/app/settings",
    title: "Oversikt",
    description: "Sammendrag og snarveier til alle innstillinger for organisasjonen.",
    icon: LayoutGrid,
    visible: () => true,
  },
  {
    id: "organization",
    href: "/app/settings/organization",
    title: "Organisasjon",
    description:
      "Virksomhetsinfo som vises på fakturaer og i appen — navn, adresse, org.nr. og betaling.",
    icon: Building,
    visible: canManageOrgSettings,
  },
  {
    id: "lokaler",
    href: "/app/settings/lokaler",
    title: "Lokaler",
    description:
      "Registrer og administrer lokaler som brukes i bookinger, forespørsler, inventar og finans.",
    icon: Building2,
    visible: () => true,
  },
  {
    id: "team",
    href: "/app/settings/team",
    title: "Team",
    description: "Se hvem som har tilgang og administrer roller i organisasjonen.",
    icon: Users,
    visible: canManageOrgSettings,
  },
  {
    id: "billing",
    href: "/app/settings/billing",
    title: "Fakturering",
    description: "Abonnement, plan og betalingsstatus for den aktive organisasjonen.",
    icon: CreditCard,
    visible: () => true,
  },
  {
    id: "support",
    href: "/app/settings/support",
    title: "Support",
    description: "Kontakt plattformsupport og følg opp sakene dine.",
    icon: LifeBuoy,
    visible: () => true,
  },
  {
    id: "account",
    href: "/app/settings/account",
    title: "Min konto",
    description: "Ditt navn, e-post og innloggingsinformasjon.",
    icon: User,
    visible: () => true,
  },
];

export function visibleSettingsSections(role: UserRole | null): SettingsSection[] {
  return SETTINGS_SECTIONS.filter((s) => s.visible(role));
}

export function settingsSectionByPath(pathname: string): SettingsSection | null {
  const normalized = pathname.replace(/\/$/, "") || "/app/settings";
  if (normalized === "/app/settings") {
    return SETTINGS_SECTIONS.find((s) => s.id === "overview") ?? null;
  }
  return (
    SETTINGS_SECTIONS.find(
      (s) => s.id !== "overview" && normalized.startsWith(s.href),
    ) ?? null
  );
}
