import {
  Calculator,
  CalendarClock,
  CalendarDays,
  CreditCard,
  FileSpreadsheet,
  Landmark,
  Link2,
  Mail,
  MessageSquare,
  PenLine,
  ShieldCheck,
  Smartphone,
  Webhook,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Order the groups appear in on the page. */
export const INTEGRATION_CATEGORIES = ["accounting", "payments", "calendar", "communication", "signing", "automation"] as const;
export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export type IntegrationStatus = "available" | "coming_soon";

export type IntegrationDefinition = {
  /** Lower-case id; also the key of its description in `appPages.settings.integrations.catalog`. */
  id: string;
  /** Product name. Brand names are not translated. */
  name: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  icon: LucideIcon;
  /** Where "Open" goes once the integration is available. Needed only when status is "available". */
  href?: string;
};

/**
 * Every integration we show. To add one: add a line here and its description in both dictionaries.
 * To launch one later: change `status` to "available" and set `href` to its settings page.
 */
export const INTEGRATIONS: readonly IntegrationDefinition[] = [
  { id: "fiken", name: "Fiken", category: "accounting", status: "coming_soon", icon: Calculator },
  { id: "tripletex", name: "Tripletex", category: "accounting", status: "coming_soon", icon: FileSpreadsheet },
  { id: "poweroffice", name: "PowerOffice Go", category: "accounting", status: "coming_soon", icon: Landmark },
  { id: "visma", name: "Visma eAccounting", category: "accounting", status: "coming_soon", icon: Calculator },
  { id: "vipps", name: "Vipps", category: "payments", status: "coming_soon", icon: Smartphone },
  { id: "stripe", name: "Stripe", category: "payments", status: "coming_soon", icon: CreditCard },
  { id: "nets", name: "Nets Easy", category: "payments", status: "coming_soon", icon: CreditCard },
  { id: "google-calendar", name: "Google Calendar", category: "calendar", status: "coming_soon", icon: CalendarDays },
  { id: "outlook", name: "Microsoft 365 Outlook", category: "calendar", status: "coming_soon", icon: CalendarClock },
  { id: "sms", name: "SMS", category: "communication", status: "coming_soon", icon: MessageSquare },
  { id: "mailchimp", name: "Mailchimp", category: "communication", status: "coming_soon", icon: Mail },
  { id: "bankid", name: "BankID", category: "signing", status: "coming_soon", icon: ShieldCheck },
  { id: "scrive", name: "Scrive", category: "signing", status: "coming_soon", icon: PenLine },
  { id: "zapier", name: "Zapier", category: "automation", status: "coming_soon", icon: Zap },
  { id: "make", name: "Make", category: "automation", status: "coming_soon", icon: Workflow },
  { id: "webhooks", name: "Webhooks", category: "automation", status: "coming_soon", icon: Webhook },
  { id: "api", name: "API", category: "automation", status: "coming_soon", icon: Link2 },
] as const;

export type IntegrationGroup = { category: IntegrationCategory; items: IntegrationDefinition[] };

/** The catalog grouped by category in page order. Categories with no items are left out. */
export function groupIntegrations(items: readonly IntegrationDefinition[] = INTEGRATIONS): IntegrationGroup[] {
  return INTEGRATION_CATEGORIES.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
}
