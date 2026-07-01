export const subscriptionsNb = {
  status: {
    active: "Aktiv",
    trialing: "Prøveperiode",
    pastDue: "Forfalt",
    canceled: "Avsluttet",
    incomplete: "Ufullstendig",
  },
  plan: {
    standard: "Standard",
    starter: "Starter",
    pro: "Pro",
    enterprise: "Enterprise",
    business: "Business",
  },
  access: {
    full: "Full tilgang",
    warning: "Advarsel (forfalt)",
    billingOnly: "Kun fakturering",
    suspended: "Suspendert",
  },
} as const;

export const subscriptionsEn = {
  status: {
    active: "Active",
    trialing: "Trial",
    pastDue: "Past due",
    canceled: "Canceled",
    incomplete: "Incomplete",
  },
  plan: {
    standard: "Standard",
    starter: "Starter",
    pro: "Pro",
    enterprise: "Enterprise",
    business: "Business",
  },
  access: {
    full: "Full access",
    warning: "Warning (past due)",
    billingOnly: "Billing only",
    suspended: "Suspended",
  },
} as const;
