export const billingNb = {
  title: "Fakturering",
  description: "Abonnement og betaling for {name}.",
  loading: "Laster fakturering",
  activating: "Aktiverer abonnement",
  noActiveOrg: "Ingen aktiv organisasjon",
  createOrgFirst: "Opprett en organisasjon før du kan administrere abonnement.",
  checkoutCanceled: "Betaling avbrutt. Fullfør for å få tilgang til appen.",
  syncFailed:
    "Betalingen er registrert, men vi kunne ikke oppdatere abonnementet ennå. Prøv «Oppdater status» eller vent et øyeblikk.",
  subscriptionUpdated: "Abonnement oppdatert.",
  subscription: "Abonnement",
  subscriptionDescription: "Betaling og faktureringsperiode administreres via Stripe.",
  stripeLinked: "Stripe-koblet",
  currentStatus: "Nåværende status",
  billingPeriod: "Faktureringsperiode",
  completePayment: "Fullfør betaling",
  addPayment: "Legg til betaling",
  startSubscription: "Start abonnement",
  openingPayment: "Åpner betaling…",
  refreshStatus: "Oppdater status",
  refreshingStatus: "Oppdaterer status…",
  manageInStripe: "Administrer i Stripe",
  ownerOnly:
    "Kun organisasjonseieren kan starte, fullføre eller administrere abonnementet.",
  contactSupportChange: "Kontakt support",
  contactSupportSuffix: "for å endre abonnement.",
  activeHint:
    "Abonnementet er aktivt. Bruk Stripe-portalen for å oppdatere betalingskort eller se fakturaer.",
  includedInPlan: "Inkludert i planen",
  perMonth: "kr/mnd",
  trialNote:
    "{days} dagers gratis prøveperiode ved oppstart. Første trekk skjer når prøven er over.",
  attention: {
    billingDisabledTitle: "Fakturering er ikke aktivert",
    billingDisabledBody:
      "Kontakt support for å endre eller aktivere abonnement i dette miljøet.",
    trialExpiredTitle: "Prøveperioden er over",
    trialExpiredOwner: "Fullfør betaling for å gjenopprette tilgang til appen.",
    trialExpiredMember:
      "Organisasjonseieren må fullføre betaling for å gjenopprette tilgang.",
    pastDueTitle: "Betalingen mislyktes",
    pastDueOwner:
      "Oppdater betalingskortet i Stripe for å gjenopprette full tilgang.",
    pastDueMember: "Organisasjonseieren må oppdatere betalingskortet.",
    incompleteTitle: "Abonnementet er ikke aktivert",
    incompleteOwner:
      "Fullfør betaling for å aktivere abonnementet og få tilgang til appen.",
    incompleteMember:
      "Organisasjonseieren må fullføre betaling for å aktivere abonnementet.",
    trialEndingTitle: "Prøveperioden utløper snart",
    trialActiveTitle: "Gratis prøveperiode",
    trialOwnerWithDays:
      "Du har {days} igjen av prøveperioden. Legg til betaling når du er klar for å fortsette etter prøven.",
    trialOwner: "Du er i prøveperiode. Legg til betaling når du er klar for å fortsette etter prøven.",
    trialMemberWithDays:
      "Organisasjonen har {days} igjen av prøveperioden. Eieren kan legge til betaling under Fakturering.",
    trialMember:
      "Organisasjonen er i prøveperiode. Eieren kan legge til betaling under Fakturering.",
    canceledTitle: "Abonnementet er avsluttet",
    canceledOwner: "Start et nytt abonnement for å få tilgang igjen.",
    canceledMember: "Organisasjonseieren kan starte et nytt abonnement.",
    daySingular: "dag",
    dayPlural: "dager",
  },
  planFeatures: {
    bookings: "Bookinger",
    inquiries: "Forespørsler",
    customers: "Kunder og partnere",
    pricing: "Priser og tjenester",
    finance: "Finans",
    invoices: "Fakturaoppfølging",
    assets: "Inventar",
    reports: "Rapporter",
    team: "Teamtilgang",
  },
} as const;

export const billingEn = {
  title: "Billing",
  description: "Subscription and payment for {name}.",
  loading: "Loading billing",
  activating: "Activating subscription",
  noActiveOrg: "No active organization",
  createOrgFirst: "Create an organization before you can manage subscription.",
  checkoutCanceled: "Payment canceled. Complete checkout to access the app.",
  syncFailed:
    "Payment was recorded, but we could not update the subscription yet. Try «Refresh status» or wait a moment.",
  subscriptionUpdated: "Subscription updated.",
  subscription: "Subscription",
  subscriptionDescription: "Payment and billing period are managed via Stripe.",
  stripeLinked: "Stripe connected",
  currentStatus: "Current status",
  billingPeriod: "Billing period",
  completePayment: "Complete payment",
  addPayment: "Add payment",
  startSubscription: "Start subscription",
  openingPayment: "Opening payment…",
  refreshStatus: "Refresh status",
  refreshingStatus: "Refreshing status…",
  manageInStripe: "Manage in Stripe",
  ownerOnly:
    "Only the organization owner can start, complete or manage the subscription.",
  contactSupportChange: "Contact support",
  contactSupportSuffix: "to change subscription.",
  activeHint:
    "Subscription is active. Use the Stripe portal to update payment card or view invoices.",
  includedInPlan: "Included in plan",
  perMonth: "NOK/month",
  trialNote:
    "{days}-day free trial on signup. First charge when the trial ends.",
  attention: {
    billingDisabledTitle: "Billing is not enabled",
    billingDisabledBody:
      "Contact support to change or enable subscription in this environment.",
    trialExpiredTitle: "Trial period has ended",
    trialExpiredOwner: "Complete payment to restore access to the app.",
    trialExpiredMember:
      "The organization owner must complete payment to restore access.",
    pastDueTitle: "Payment failed",
    pastDueOwner: "Update the payment card in Stripe to restore full access.",
    pastDueMember: "The organization owner must update the payment card.",
    incompleteTitle: "Subscription is not activated",
    incompleteOwner:
      "Complete payment to activate the subscription and access the app.",
    incompleteMember:
      "The organization owner must complete payment to activate the subscription.",
    trialEndingTitle: "Trial ending soon",
    trialActiveTitle: "Free trial",
    trialOwnerWithDays:
      "You have {days} left in your trial. Add payment when ready to continue after the trial.",
    trialOwner:
      "You are in a trial period. Add payment when ready to continue after the trial.",
    trialMemberWithDays:
      "The organization has {days} left in the trial. The owner can add payment under Billing.",
    trialMember:
      "The organization is in a trial period. The owner can add payment under Billing.",
    canceledTitle: "Subscription canceled",
    canceledOwner: "Start a new subscription to regain access.",
    canceledMember: "The organization owner can start a new subscription.",
    daySingular: "day",
    dayPlural: "days",
  },
  planFeatures: {
    bookings: "Bookings",
    inquiries: "Inquiries",
    customers: "Customers and partners",
    pricing: "Pricing and services",
    finance: "Finance",
    invoices: "Invoice follow-up",
    assets: "Inventory",
    reports: "Reports",
    team: "Team access",
  },
} as const;
