import { adminNb } from "@/i18n/dictionaries/parts/admin";
import { adminLabelsNb } from "@/i18n/dictionaries/parts/admin-labels";
import { auditNb } from "@/i18n/dictionaries/parts/audit";
import { appPagesNb } from "@/i18n/dictionaries/parts/appPages";
import { assetsNb } from "@/i18n/dictionaries/parts/assets";
import { bookingsNb } from "@/i18n/dictionaries/parts/bookings";
import { calendarNb } from "@/i18n/dictionaries/parts/calendar";
import {
  adminNavNb,
  commonNb,
  navigationNb,
  settingsNavNb,
} from "@/i18n/dictionaries/parts/common";
import { customersNb } from "@/i18n/dictionaries/parts/customers";
import { dashboardNb } from "@/i18n/dictionaries/parts/dashboard";
import { financeNb } from "@/i18n/dictionaries/parts/finance";
import { inquiriesNb } from "@/i18n/dictionaries/parts/inquiries";
import { invoicesNb } from "@/i18n/dictionaries/parts/invoices";
import { landingNb } from "@/i18n/dictionaries/parts/landing";
import { notificationsNb } from "@/i18n/dictionaries/parts/notifications";
import { overnattingNb } from "@/i18n/dictionaries/parts/overnatting";
import { subscriptionsNb } from "@/i18n/dictionaries/parts/subscriptions";
import { supportNb } from "@/i18n/dictionaries/parts/support";
import { pricingNb } from "@/i18n/dictionaries/parts/pricing";
import { propertiesNb } from "@/i18n/dictionaries/parts/properties";
import { reportsNb } from "@/i18n/dictionaries/parts/reports";
import { settingsNb } from "@/i18n/dictionaries/parts/settings";
import { billingNb } from "@/i18n/dictionaries/parts/billing";
import { organizationsNb } from "@/i18n/dictionaries/parts/organizations";
import { authNb, formsNb, rolesNb, statusesNb } from "@/i18n/dictionaries/parts/auth";
import { validationNb } from "@/i18n/dictionaries/parts/validation";
import { integrationsNb } from "@/i18n/dictionaries/parts/integrations";
import { serverErrorsNb } from "@/i18n/dictionaries/parts/serverErrors";

export const nb = {
  admin: adminNb,
  adminLabels: adminLabelsNb,
  audit: auditNb,
  common: commonNb,
  navigation: navigationNb,
  settingsNav: settingsNavNb,
  adminNav: adminNavNb,
  auth: authNb,
  roles: rolesNb,
  statuses: statusesNb,
  forms: { ...formsNb, validation: validationNb },
  landing: landingNb,
  dashboard: dashboardNb,
  calendar: calendarNb,
  appPages: appPagesNb,
  bookings: bookingsNb,
  inquiries: inquiriesNb,
  customers: customersNb,
  finance: financeNb,
  invoices: invoicesNb,
  overnatting: overnattingNb,
  assets: assetsNb,
  reports: reportsNb,
  pricing: pricingNb,
  properties: propertiesNb,
  settings: settingsNb,
  support: supportNb,
  subscriptions: subscriptionsNb,
  notifications: notificationsNb,
  organizations: organizationsNb,
  billing: billingNb,
  integrations: integrationsNb,
  serverErrors: serverErrorsNb,
} as const;
